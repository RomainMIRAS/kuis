package api

import (
	"encoding/json"
	"io"
	"log"

	"github.com/gofiber/contrib/websocket"
	"github.com/gofiber/fiber/v2"

	"github.com/mirasr/kuis/internal/k8s"
)

type execMessage struct {
	Type string `json:"type"`
	Data string `json:"data,omitempty"`
	Rows uint16 `json:"rows,omitempty"`
	Cols uint16 `json:"cols,omitempty"`
}

func (h *Handlers) ExecPod(c *fiber.Ctx) error {
	if websocket.IsWebSocketUpgrade(c) {
		return websocket.New(func(conn *websocket.Conn) {
			defer conn.Close()

			namespace := conn.Params("namespace")
			pod := conn.Params("pod")
			container := conn.Query("container", "")
			shell := conn.Query("shell", "/bin/sh")

			stdinReader, stdinWriter := io.Pipe()
			defer stdinWriter.Close()

			sizeQueue := k8s.NewSizeQueue()
			defer sizeQueue.Close()

			stdoutWriter := &wsWriter{conn: conn}

			go func() {
				for {
					_, msg, err := conn.ReadMessage()
					if err != nil {
						stdinWriter.Close()
						return
					}

					var m execMessage
					if err := json.Unmarshal(msg, &m); err != nil {
						continue
					}

					switch m.Type {
					case "input":
						if _, err := stdinWriter.Write([]byte(m.Data)); err != nil {
							return
						}
					case "resize":
						sizeQueue.Resize(k8s.TerminalSize{
							Width:  m.Cols,
							Height: m.Rows,
						})
					}
				}
			}()

			err := h.client().Exec(k8s.ExecOptions{
				Namespace: namespace,
				Pod:       pod,
				Container: container,
				Command:   []string{shell},
				Stdin:     stdinReader,
				Stdout:    stdoutWriter,
				TTY:       true,
			}, sizeQueue)

			if err != nil {
				log.Printf("exec error: %v", err)
				errMsg, _ := json.Marshal(execMessage{Type: "error", Data: err.Error()})
				conn.WriteMessage(websocket.TextMessage, errMsg)
			}
		})(c)
	}
	return fiber.ErrUpgradeRequired
}

type wsWriter struct {
	conn *websocket.Conn
}

func (w *wsWriter) Write(p []byte) (int, error) {
	msg, _ := json.Marshal(execMessage{Type: "output", Data: string(p)})
	if err := w.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
		return 0, err
	}
	return len(p), nil
}
