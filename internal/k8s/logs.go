package k8s

import (
	"bufio"
	"context"
	"fmt"
	"io"

	corev1 "k8s.io/api/core/v1"
)

type LogOptions struct {
	Namespace string
	Pod       string
	Container string
	Follow    bool
	TailLines int64
	Previous  bool
}

func (c *Client) StreamLogs(ctx context.Context, opts LogOptions, out chan<- string) error {
	podLogOpts := &corev1.PodLogOptions{
		Container: opts.Container,
		Follow:    opts.Follow,
		Previous:  opts.Previous,
	}
	if opts.TailLines > 0 {
		podLogOpts.TailLines = &opts.TailLines
	}

	req := c.Clientset.CoreV1().Pods(opts.Namespace).GetLogs(opts.Pod, podLogOpts)
	stream, err := req.Stream(ctx)
	if err != nil {
		return fmt.Errorf("opening log stream: %w", err)
	}
	defer stream.Close()

	scanner := bufio.NewScanner(stream)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case out <- scanner.Text():
		}
	}

	return scanner.Err()
}

func (c *Client) GetLogs(ctx context.Context, opts LogOptions) (string, error) {
	podLogOpts := &corev1.PodLogOptions{
		Container: opts.Container,
		Previous:  opts.Previous,
	}
	if opts.TailLines > 0 {
		podLogOpts.TailLines = &opts.TailLines
	}

	req := c.Clientset.CoreV1().Pods(opts.Namespace).GetLogs(opts.Pod, podLogOpts)
	stream, err := req.Stream(ctx)
	if err != nil {
		return "", fmt.Errorf("opening log stream: %w", err)
	}
	defer stream.Close()

	data, err := io.ReadAll(stream)
	if err != nil {
		return "", fmt.Errorf("reading logs: %w", err)
	}
	return string(data), nil
}
