package k8s

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
)

var ResourceGVRMap = map[string]schema.GroupVersionResource{
	"pods":         {Group: "", Version: "v1", Resource: "pods"},
	"services":     {Group: "", Version: "v1", Resource: "services"},
	"configmaps":   {Group: "", Version: "v1", Resource: "configmaps"},
	"secrets":      {Group: "", Version: "v1", Resource: "secrets"},
	"namespaces":   {Group: "", Version: "v1", Resource: "namespaces"},
	"nodes":        {Group: "", Version: "v1", Resource: "nodes"},
	"events":       {Group: "", Version: "v1", Resource: "events"},

	"deployments":  {Group: "apps", Version: "v1", Resource: "deployments"},
	"statefulsets": {Group: "apps", Version: "v1", Resource: "statefulsets"},
	"daemonsets":   {Group: "apps", Version: "v1", Resource: "daemonsets"},
	"replicasets":  {Group: "apps", Version: "v1", Resource: "replicasets"},

	"jobs":         {Group: "batch", Version: "v1", Resource: "jobs"},
	"cronjobs":     {Group: "batch", Version: "v1", Resource: "cronjobs"},

	"ingresses":    {Group: "networking.k8s.io", Version: "v1", Resource: "ingresses"},
}

func ResolveGVR(group, resource string) (schema.GroupVersionResource, error) {
	if gvr, ok := ResourceGVRMap[resource]; ok {
		return gvr, nil
	}
	if group == "core" || group == "" {
		return schema.GroupVersionResource{Group: "", Version: "v1", Resource: resource}, nil
	}
	return schema.GroupVersionResource{Group: group, Version: "v1", Resource: resource}, nil
}

func (c *Client) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	var ri dynamic.ResourceInterface
	if namespace != "" && namespace != "_all" {
		ri = c.DynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		ri = c.DynamicClient.Resource(gvr)
	}
	return ri.List(ctx, metav1.ListOptions{})
}

func (c *Client) GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	var ri dynamic.ResourceInterface
	if namespace != "" {
		ri = c.DynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		ri = c.DynamicClient.Resource(gvr)
	}
	return ri.Get(ctx, name, metav1.GetOptions{})
}

func (c *Client) UpdateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	var ri dynamic.ResourceInterface
	if namespace != "" {
		ri = c.DynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		ri = c.DynamicClient.Resource(gvr)
	}
	return ri.Update(ctx, obj, metav1.UpdateOptions{})
}

func (c *Client) DeleteResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) error {
	var ri dynamic.ResourceInterface
	if namespace != "" {
		ri = c.DynamicClient.Resource(gvr).Namespace(namespace)
	} else {
		ri = c.DynamicClient.Resource(gvr)
	}
	return ri.Delete(ctx, name, metav1.DeleteOptions{})
}

func (c *Client) ScaleDeployment(ctx context.Context, namespace, name string, replicas int32) error {
	scale, err := c.Clientset.AppsV1().Deployments(namespace).GetScale(ctx, name, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("getting scale: %w", err)
	}
	scale.Spec.Replicas = replicas
	_, err = c.Clientset.AppsV1().Deployments(namespace).UpdateScale(ctx, name, scale, metav1.UpdateOptions{})
	return err
}

func (c *Client) RestartDeployment(ctx context.Context, namespace, name string) error {
	patch := fmt.Sprintf(`{"spec":{"template":{"metadata":{"annotations":{"kubectl.kubernetes.io/restartedAt":"%s"}}}}}`, time.Now().Format(time.RFC3339))
	_, err := c.Clientset.AppsV1().Deployments(namespace).Patch(ctx, name, types.StrategicMergePatchType, []byte(patch), metav1.PatchOptions{})
	return err
}

func (c *Client) ListNamespaces(ctx context.Context) ([]string, error) {
	nsList, err := c.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	names := make([]string, len(nsList.Items))
	for i, ns := range nsList.Items {
		names[i] = ns.Name
	}
	return names, nil
}

func (c *Client) GetDeployment(ctx context.Context, namespace, name string) (*appsv1.Deployment, error) {
	return c.Clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
}

func ResourceToJSON(obj interface{}) ([]byte, error) {
	return json.Marshal(obj)
}
