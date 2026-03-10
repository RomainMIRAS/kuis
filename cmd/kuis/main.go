package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/mirasr/kuis/internal/api"
	"github.com/mirasr/kuis/internal/config"
	"github.com/mirasr/kuis/internal/k8s"
)

func main() {
	cfg := config.Load()

	mgr, err := k8s.NewClientManager(cfg.Kubeconfig, cfg.KubeconfigDir)
	if err != nil {
		log.Fatalf("Failed to create Kubernetes client manager: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	watcher := k8s.NewWatcher(mgr.Client())
	go watcher.Run(ctx)

	srv := api.NewServer(cfg, mgr, watcher)

	go func() {
		addr := fmt.Sprintf(":%d", cfg.Port)
		log.Printf("KUIS starting on %s", addr)
		log.Printf("Kubeconfigs found: %v", mgr.ListKubeconfigs())
		if err := srv.Listen(addr); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down KUIS...")
	cancel()
	if err := srv.Shutdown(); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
}
