package k8s

import (
	"io"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes/scheme"
	"k8s.io/client-go/tools/remotecommand"
)

type ExecOptions struct {
	Namespace string
	Pod       string
	Container string
	Command   []string
	Stdin     io.Reader
	Stdout    io.Writer
	Stderr    io.Writer
	TTY       bool
}

type TerminalSize struct {
	Width  uint16
	Height uint16
}

type SizeQueue struct {
	resizeCh chan remotecommand.TerminalSize
}

func NewSizeQueue() *SizeQueue {
	return &SizeQueue{
		resizeCh: make(chan remotecommand.TerminalSize, 1),
	}
}

func (sq *SizeQueue) Next() *remotecommand.TerminalSize {
	size, ok := <-sq.resizeCh
	if !ok {
		return nil
	}
	return &size
}

func (sq *SizeQueue) Resize(size TerminalSize) {
	select {
	case sq.resizeCh <- remotecommand.TerminalSize{Width: size.Width, Height: size.Height}:
	default:
	}
}

func (sq *SizeQueue) Close() {
	close(sq.resizeCh)
}

func (c *Client) Exec(opts ExecOptions, sizeQueue remotecommand.TerminalSizeQueue) error {
	req := c.Clientset.CoreV1().RESTClient().Post().
		Resource("pods").
		Name(opts.Pod).
		Namespace(opts.Namespace).
		SubResource("exec").
		VersionedParams(&corev1.PodExecOptions{
			Container: opts.Container,
			Command:   opts.Command,
			Stdin:     opts.Stdin != nil,
			Stdout:    true,
			Stderr:    !opts.TTY,
			TTY:       opts.TTY,
		}, scheme.ParameterCodec)

	exec, err := remotecommand.NewSPDYExecutor(c.RestConfig, "POST", req.URL())
	if err != nil {
		return err
	}

	streamOpts := remotecommand.StreamOptions{
		Stdin:             opts.Stdin,
		Stdout:            opts.Stdout,
		Stderr:            opts.Stderr,
		Tty:               opts.TTY,
		TerminalSizeQueue: sizeQueue,
	}

	return exec.Stream(streamOpts)
}
