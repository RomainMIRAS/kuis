package api

import (
	"encoding/json"
	"sort"
	"strings"

	"github.com/gofiber/fiber/v2"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/yaml"

	"github.com/mirasr/kuis/internal/k8s"
)

type Handlers struct {
	mgr     *k8s.ClientManager
	watcher *k8s.Watcher
}

func NewHandlers(mgr *k8s.ClientManager, watcher *k8s.Watcher) *Handlers {
	return &Handlers{mgr: mgr, watcher: watcher}
}

// client returns the active k8s client (shortcut).
func (h *Handlers) client() *k8s.Client {
	return h.mgr.Client()
}

// --- Kubeconfig management ---

func (h *Handlers) ListKubeconfigs(c *fiber.Ctx) error {
	configs := h.mgr.ListKubeconfigs()
	active := h.mgr.ActiveKubeconfig()
	return c.JSON(fiber.Map{"configs": configs, "active": active})
}

func (h *Handlers) SwitchKubeconfig(c *fiber.Ctx) error {
	name := c.Params("name")
	if err := h.mgr.SwitchKubeconfig(name); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	h.watcher.UpdateClient(h.client())
	return c.JSON(fiber.Map{"status": "ok", "active": name})
}

func (h *Handlers) RescanKubeconfigs(c *fiber.Ctx) error {
	configs := h.mgr.Rescan()
	active := h.mgr.ActiveKubeconfig()
	return c.JSON(fiber.Map{"configs": configs, "active": active})
}

// --- Contexts ---

func (h *Handlers) ListContexts(c *fiber.Ctx) error {
	contexts, current, err := h.client().GetContexts()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	sort.Strings(contexts)
	return c.JSON(fiber.Map{"contexts": contexts, "current": current})
}

func (h *Handlers) SwitchContext(c *fiber.Ctx) error {
	name := c.Params("name")
	if err := h.client().SwitchContext(name); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	h.watcher.UpdateClient(h.client())
	return c.JSON(fiber.Map{"status": "ok", "context": name})
}

// --- Namespaces ---

func (h *Handlers) ListNamespaces(c *fiber.Ctx) error {
	namespaces, err := h.client().ListNamespaces(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	sort.Strings(namespaces)
	return c.JSON(fiber.Map{"namespaces": namespaces})
}

// --- Resources ---

func (h *Handlers) ListResources(c *fiber.Ctx) error {
	group := c.Params("group")
	resource := c.Params("resource")
	namespace := c.Query("namespace", "")

	gvr, err := k8s.ResolveGVR(group, resource)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	list, err := h.client().ListResources(c.Context(), gvr, namespace)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"items": list.Items, "count": len(list.Items)})
}

func (h *Handlers) GetResource(c *fiber.Ctx) error {
	group := c.Params("group")
	resource := c.Params("resource")
	namespace := c.Params("namespace")
	name := c.Params("name")

	gvr, err := k8s.ResolveGVR(group, resource)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	obj, err := h.client().GetResource(c.Context(), gvr, namespace, name)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(obj.Object)
}

func (h *Handlers) GetResourceYAML(c *fiber.Ctx) error {
	group := c.Params("group")
	resource := c.Params("resource")
	namespace := c.Params("namespace")
	name := c.Params("name")

	gvr, err := k8s.ResolveGVR(group, resource)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	obj, err := h.client().GetResource(c.Context(), gvr, namespace, name)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	yamlBytes, err := yaml.Marshal(obj.Object)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to marshal YAML"})
	}

	c.Set("Content-Type", "text/yaml")
	return c.Send(yamlBytes)
}

func (h *Handlers) UpdateResource(c *fiber.Ctx) error {
	group := c.Params("group")
	resource := c.Params("resource")
	namespace := c.Params("namespace")

	gvr, err := k8s.ResolveGVR(group, resource)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	body := c.Body()
	var jsonData map[string]interface{}

	if err := yaml.Unmarshal(body, &jsonData); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid YAML/JSON: " + err.Error()})
	}

	obj := &unstructured.Unstructured{Object: jsonData}
	result, err := h.client().UpdateResource(c.Context(), gvr, namespace, obj)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result.Object)
}

func (h *Handlers) DeleteResource(c *fiber.Ctx) error {
	group := c.Params("group")
	resource := c.Params("resource")
	namespace := c.Params("namespace")
	name := c.Params("name")

	gvr, err := k8s.ResolveGVR(group, resource)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.client().DeleteResource(c.Context(), gvr, namespace, name); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "deleted", "name": name})
}

func (h *Handlers) ScaleDeployment(c *fiber.Ctx) error {
	namespace := c.Params("namespace")
	name := c.Params("name")

	var body struct {
		Replicas int32 `json:"replicas"`
	}
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid body"})
	}

	if err := h.client().ScaleDeployment(c.Context(), namespace, name, body.Replicas); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "scaled", "replicas": body.Replicas})
}

func (h *Handlers) RestartDeployment(c *fiber.Ctx) error {
	namespace := c.Params("namespace")
	name := c.Params("name")

	if err := h.client().RestartDeployment(c.Context(), namespace, name); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "restarted"})
}

func (h *Handlers) ListContainers(c *fiber.Ctx) error {
	group := c.Params("group")
	resource := c.Params("resource")
	namespace := c.Params("namespace")
	name := c.Params("name")

	if resource != "pods" {
		return c.Status(400).JSON(fiber.Map{"error": "containers only available for pods"})
	}

	gvr, _ := k8s.ResolveGVR(group, resource)
	obj, err := h.client().GetResource(c.Context(), gvr, namespace, name)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	containers := extractContainerNames(obj)
	return c.JSON(fiber.Map{"containers": containers})
}

func (h *Handlers) ListResourceEvents(c *fiber.Ctx) error {
	resource := c.Params("resource")
	namespace := c.Params("namespace")
	name := c.Params("name")

	resourceKindMap := map[string]string{
		"pods": "Pod", "deployments": "Deployment", "statefulsets": "StatefulSet",
		"daemonsets": "DaemonSet", "replicasets": "ReplicaSet", "services": "Service",
		"configmaps": "ConfigMap", "secrets": "Secret", "jobs": "Job",
		"cronjobs": "CronJob", "ingresses": "Ingress", "nodes": "Node",
		"namespaces": "Namespace",
	}
	kind := resourceKindMap[resource]
	if kind == "" {
		kind = strings.TrimSuffix(resource, "s")
		kind = strings.ToUpper(kind[:1]) + kind[1:]
	}

	fieldSelector := "involvedObject.name=" + name
	if kind != "" {
		fieldSelector += ",involvedObject.kind=" + kind
	}

	events, err := h.client().Clientset.CoreV1().Events(namespace).List(c.Context(), metav1.ListOptions{
		FieldSelector: fieldSelector,
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	sort.Slice(events.Items, func(i, j int) bool {
		ti := events.Items[i].LastTimestamp.Time
		tj := events.Items[j].LastTimestamp.Time
		return ti.After(tj)
	})

	type eventItem struct {
		Type      string `json:"type"`
		Reason    string `json:"reason"`
		Message   string `json:"message"`
		Source    string `json:"source"`
		Count     int32  `json:"count"`
		FirstSeen string `json:"firstSeen"`
		LastSeen  string `json:"lastSeen"`
	}

	items := make([]eventItem, 0, len(events.Items))
	for _, e := range events.Items {
		source := e.Source.Component
		if e.Source.Host != "" {
			source += "/" + e.Source.Host
		}
		items = append(items, eventItem{
			Type:      e.Type,
			Reason:    e.Reason,
			Message:   e.Message,
			Source:    source,
			Count:     e.Count,
			FirstSeen: e.FirstTimestamp.Time.Format("2006-01-02T15:04:05Z"),
			LastSeen:  e.LastTimestamp.Time.Format("2006-01-02T15:04:05Z"),
		})
	}

	return c.JSON(fiber.Map{"events": items, "count": len(items)})
}

func extractContainerNames(obj *unstructured.Unstructured) []string {
	spec, found, _ := unstructured.NestedSlice(obj.Object, "spec", "containers")
	if !found {
		return nil
	}
	names := make([]string, 0, len(spec))
	for _, c := range spec {
		if container, ok := c.(map[string]interface{}); ok {
			if name, ok := container["name"].(string); ok {
				names = append(names, name)
			}
		}
	}
	return names
}
