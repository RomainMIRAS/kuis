package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port          int
	Kubeconfig    string
	KubeconfigDir string
	DevMode       bool
	DevProxy      string
}

func Load() *Config {
	port := 8080
	if v := os.Getenv("KUIS_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			port = p
		}
	}

	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		if home, err := os.UserHomeDir(); err == nil {
			kubeconfig = home + "/.kube/config"
		}
	}

	kubeconfigDir := os.Getenv("KUIS_KUBECONFIG_DIR")
	if kubeconfigDir == "" {
		if home, err := os.UserHomeDir(); err == nil {
			kubeconfigDir = home + "/.kube/configs"
		}
	}

	devMode := os.Getenv("KUIS_DEV") == "true"
	devProxy := os.Getenv("KUIS_DEV_PROXY")
	if devProxy == "" {
		devProxy = "http://localhost:5173"
	}

	return &Config{
		Port:          port,
		Kubeconfig:    kubeconfig,
		KubeconfigDir: kubeconfigDir,
		DevMode:       devMode,
		DevProxy:      devProxy,
	}
}
