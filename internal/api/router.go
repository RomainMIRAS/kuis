package api

import (
	"embed"
	"io/fs"
	"log"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	fiberlog "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/mirasr/kuis/internal/config"
	"github.com/mirasr/kuis/internal/k8s"
)

//go:embed all:dist
var embeddedFS embed.FS

func NewServer(cfg *config.Config, mgr *k8s.ClientManager, watcher *k8s.Watcher) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:      "KUIS",
		ServerHeader: "KUIS",
	})

	app.Use(recover.New())
	app.Use(fiberlog.New(fiberlog.Config{
		Format: "${time} ${status} ${method} ${path} ${latency}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
	}))

	h := NewHandlers(mgr, watcher)

	api := app.Group("/api")

	api.Get("/kubeconfigs", h.ListKubeconfigs)
	api.Put("/kubeconfigs/:name", h.SwitchKubeconfig)
	api.Post("/kubeconfigs/rescan", h.RescanKubeconfigs)

	api.Get("/contexts", h.ListContexts)
	api.Put("/contexts/:name", h.SwitchContext)
	api.Get("/namespaces", h.ListNamespaces)

	api.Get("/resources/:group/:resource", h.ListResources)
	api.Get("/resources/:group/:resource/:namespace/:name", h.GetResource)
	api.Get("/resources/:group/:resource/:namespace/:name/yaml", h.GetResourceYAML)
	api.Put("/resources/:group/:resource/:namespace/:name", h.UpdateResource)
	api.Delete("/resources/:group/:resource/:namespace/:name", h.DeleteResource)

	api.Post("/resources/apps/deployments/:namespace/:name/scale", h.ScaleDeployment)
	api.Post("/resources/apps/deployments/:namespace/:name/restart", h.RestartDeployment)

	api.Get("/resources/:group/:resource/:namespace/:name/containers", h.ListContainers)

	app.Get("/ws/watch", h.WatchResources)
	app.Get("/ws/logs/:namespace/:pod", h.StreamLogs)
	app.Get("/ws/exec/:namespace/:pod", h.ExecPod)

	if cfg.DevMode {
		log.Printf("Dev mode: proxying frontend to %s", cfg.DevProxy)
	} else {
		serveFrontend(app)
	}

	return app
}

func serveFrontend(app *fiber.App) {
	distFS, err := fs.Sub(embeddedFS, "dist")
	if err != nil {
		log.Printf("Warning: no embedded frontend found: %v", err)
		return
	}

	app.Use("/", filesystem.New(filesystem.Config{
		Root:         http.FS(distFS),
		Browse:       false,
		Index:        "index.html",
		NotFoundFile: "index.html",
	}))
}
