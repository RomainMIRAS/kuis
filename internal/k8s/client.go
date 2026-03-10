package k8s

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
)

type Client struct {
	Clientset      kubernetes.Interface
	DynamicClient  dynamic.Interface
	RestConfig     *rest.Config
	kubeconfigPath string
}

// ClientManager manages multiple kubeconfig files and the active client.
type ClientManager struct {
	mu             sync.RWMutex
	active         *Client
	activeConfig   string // display name of the active kubeconfig
	defaultPath    string // e.g. ~/.kube/config
	configDir      string // e.g. ~/.kube/configs/
	configs        map[string]string // name -> absolute path
}

func NewClientManager(defaultKubeconfig, kubeconfigDir string) (*ClientManager, error) {
	mgr := &ClientManager{
		defaultPath: defaultKubeconfig,
		configDir:   kubeconfigDir,
		configs:     make(map[string]string),
	}

	mgr.scanConfigs()

	// Pick the first available config to connect to
	activeName, activePath := mgr.pickInitialConfig()
	if activePath == "" {
		return nil, fmt.Errorf("no kubeconfig found (checked %s and %s)", defaultKubeconfig, kubeconfigDir)
	}

	client, err := NewClient(activePath)
	if err != nil {
		return nil, fmt.Errorf("connecting to %s: %w", activeName, err)
	}

	mgr.active = client
	mgr.activeConfig = activeName
	log.Printf("Active kubeconfig: %s (%s)", activeName, activePath)

	return mgr, nil
}

// scanConfigs discovers kubeconfig files from the default path and the config directory.
func (m *ClientManager) scanConfigs() {
	m.configs = make(map[string]string)

	if m.defaultPath != "" {
		if info, err := os.Stat(m.defaultPath); err == nil && !info.IsDir() {
			m.configs["default"] = m.defaultPath
		}
	}

	if m.configDir == "" {
		return
	}

	entries, err := os.ReadDir(m.configDir)
	if err != nil {
		log.Printf("Cannot read kubeconfig dir %s: %v", m.configDir, err)
		return
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		// Skip hidden files and non-config looking files
		if strings.HasPrefix(name, ".") {
			continue
		}
		absPath := filepath.Join(m.configDir, name)

		// Use filename without extension as display name
		displayName := strings.TrimSuffix(name, filepath.Ext(name))
		if displayName == "" {
			displayName = name
		}

		// Avoid collision with the "default" key
		if displayName == "default" {
			displayName = "default-" + name
		}

		m.configs[displayName] = absPath
	}
}

func (m *ClientManager) pickInitialConfig() (string, string) {
	// Prefer "default" (~/.kube/config)
	if p, ok := m.configs["default"]; ok {
		return "default", p
	}
	// Otherwise pick the first alphabetically
	names := m.ListKubeconfigs()
	if len(names) > 0 {
		return names[0], m.configs[names[0]]
	}
	return "", ""
}

// ListKubeconfigs returns sorted display names of all discovered kubeconfig files.
func (m *ClientManager) ListKubeconfigs() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	names := make([]string, 0, len(m.configs))
	for name := range m.configs {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// ActiveKubeconfig returns the display name of the currently active kubeconfig.
func (m *ClientManager) ActiveKubeconfig() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.activeConfig
}

// SwitchKubeconfig switches to a different kubeconfig file by display name.
func (m *ClientManager) SwitchKubeconfig(name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	path, ok := m.configs[name]
	if !ok {
		return fmt.Errorf("kubeconfig %q not found", name)
	}

	client, err := NewClient(path)
	if err != nil {
		return fmt.Errorf("connecting with %s: %w", name, err)
	}

	m.active = client
	m.activeConfig = name
	log.Printf("Switched kubeconfig to: %s (%s)", name, path)
	return nil
}

// Rescan rescans the config directory for new/removed files.
func (m *ClientManager) Rescan() []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.scanConfigs()

	names := make([]string, 0, len(m.configs))
	for name := range m.configs {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

// Client returns the currently active Client (thread-safe).
func (m *ClientManager) Client() *Client {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.active
}

// --- Single Client ---

func NewClient(kubeconfigPath string) (*Client, error) {
	config, err := buildConfig(kubeconfigPath)
	if err != nil {
		return nil, fmt.Errorf("building config: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("creating clientset: %w", err)
	}

	dynClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("creating dynamic client: %w", err)
	}

	return &Client{
		Clientset:      clientset,
		DynamicClient:  dynClient,
		RestConfig:     config,
		kubeconfigPath: kubeconfigPath,
	}, nil
}

func buildConfig(kubeconfigPath string) (*rest.Config, error) {
	if config, err := rest.InClusterConfig(); err == nil {
		return config, nil
	}

	if kubeconfigPath == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("getting home dir: %w", err)
		}
		kubeconfigPath = filepath.Join(home, ".kube", "config")
	}

	return clientcmd.BuildConfigFromFlags("", kubeconfigPath)
}

func (c *Client) GetContexts() ([]string, string, error) {
	rawConfig, err := c.getRawConfig()
	if err != nil {
		return nil, "", err
	}

	contexts := make([]string, 0, len(rawConfig.Contexts))
	for name := range rawConfig.Contexts {
		contexts = append(contexts, name)
	}
	return contexts, rawConfig.CurrentContext, nil
}

func (c *Client) SwitchContext(name string) error {
	rawConfig, err := c.getRawConfig()
	if err != nil {
		return err
	}

	if _, ok := rawConfig.Contexts[name]; !ok {
		return fmt.Errorf("context %q not found", name)
	}

	rawConfig.CurrentContext = name
	if err := clientcmd.ModifyConfig(clientcmd.NewDefaultPathOptions(), *rawConfig, true); err != nil {
		return fmt.Errorf("modifying config: %w", err)
	}

	config, err := buildConfig(c.kubeconfigPath)
	if err != nil {
		return fmt.Errorf("rebuilding config: %w", err)
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("recreating clientset: %w", err)
	}

	dynClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return fmt.Errorf("recreating dynamic client: %w", err)
	}

	c.Clientset = clientset
	c.DynamicClient = dynClient
	c.RestConfig = config
	return nil
}

func (c *Client) getRawConfig() (*api.Config, error) {
	loadingRules := &clientcmd.ClientConfigLoadingRules{ExplicitPath: c.kubeconfigPath}
	configOverrides := &clientcmd.ConfigOverrides{}
	kubeConfig := clientcmd.NewNonInteractiveDeferredLoadingClientConfig(loadingRules, configOverrides)
	rawConfig, err := kubeConfig.RawConfig()
	if err != nil {
		return nil, fmt.Errorf("loading kubeconfig: %w", err)
	}
	return &rawConfig, nil
}
