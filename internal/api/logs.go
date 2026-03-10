package api

import (
	"context"
	"log"
	"strconv"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"

	"github.com/mirasr/kuis/internal/k8s"
)

func (h *Handlers) StreamLogs(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		return websocket.New(func(conn *websocket.Conn) {
			defer conn.Close()

			namespace := conn.Params("namespace")
			pod := conn.Params("pod")
			container := conn.Query("container", "")
			follow := conn.Query("follow", "true") == "true"
			previous := conn.Query("previous", "false") == "true"

			var tailLines int64 = 100
			if tl := conn.Query("tailLines", ""); tl != "" {
				if parsed, err := strconv.ParseInt(tl, 10, 64); err == nil {
					tailLines = parsed
				}
			}

			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()

			go func() {
				for {
					if _, _, err := conn.ReadMessage(); err != nil {
						cancel()
						return
					}
				}
			}()

			logCh := make(chan string, 128)
			go func() {
				defer close(logCh)
				err := h.client().StreamLogs(ctx, k8s.LogOptions{
					Namespace: namespace,
					Pod:       pod,
					Container: container,
					Follow:    follow,
					TailLines: tailLines,
					Previous:  previous,
				}, logCh)
				if err != nil && ctx.Err() == nil {
					log.Printf("log stream error: %v", err)
				}
			}()

			for line := range logCh {
				if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
					return
				}
			}
		})(c)
	}
	return fiber.ErrUpgradeRequired
}
