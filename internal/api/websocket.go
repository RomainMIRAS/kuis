package api

import (
	"context"
	"log"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"
)

func (h *Handlers) WatchResources(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		return websocket.New(func(conn *websocket.Conn) {
			defer conn.Close()

			resource := conn.Query("resource", "pods")
			namespace := conn.Query("namespace", "")

			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()

			sub := h.watcher.Subscribe(ctx, resource, namespace)
			defer h.watcher.Unsubscribe(sub)

			go func() {
				for {
					if _, _, err := conn.ReadMessage(); err != nil {
						cancel()
						return
					}
				}
			}()

			for {
				select {
				case <-ctx.Done():
					return
				case data, ok := <-sub.Ch:
					if !ok {
						return
					}
					if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
						log.Printf("ws write error: %v", err)
						return
					}
				}
			}
		})(c)
	}
	return fiber.ErrUpgradeRequired
}
