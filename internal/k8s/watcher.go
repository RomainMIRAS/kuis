package k8s

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/watch"
)

type WatchEvent struct {
	Type      string                     `json:"type"`
	Resource  string                     `json:"resource"`
	Namespace string                     `json:"namespace"`
	Object    *unstructured.Unstructured `json:"object"`
}

type Subscriber struct {
	Ch        chan []byte
	Resource  string
	Namespace string
}

type Watcher struct {
	client      *Client
	subscribers map[string][]*Subscriber
	mu          sync.RWMutex
	activeWatch map[string]context.CancelFunc
}

func NewWatcher(client *Client) *Watcher {
	return &Watcher{
		client:      client,
		subscribers: make(map[string][]*Subscriber),
		activeWatch: make(map[string]context.CancelFunc),
	}
}

// UpdateClient replaces the underlying K8s client and restarts all active watches.
func (w *Watcher) UpdateClient(client *Client) {
	w.mu.Lock()
	defer w.mu.Unlock()

	w.client = client

	for key, cancel := range w.activeWatch {
		cancel()
		delete(w.activeWatch, key)
	}
}

func (w *Watcher) Run(ctx context.Context) {
	<-ctx.Done()
	w.mu.Lock()
	defer w.mu.Unlock()
	for _, cancel := range w.activeWatch {
		cancel()
	}
	for key, subs := range w.subscribers {
		for _, sub := range subs {
			close(sub.Ch)
		}
		delete(w.subscribers, key)
	}
}

func watchKey(resource, namespace string) string {
	return resource + "/" + namespace
}

func (w *Watcher) Subscribe(ctx context.Context, resource, namespace string) *Subscriber {
	sub := &Subscriber{
		Ch:        make(chan []byte, 64),
		Resource:  resource,
		Namespace: namespace,
	}

	key := watchKey(resource, namespace)
	w.mu.Lock()
	w.subscribers[key] = append(w.subscribers[key], sub)

	if _, ok := w.activeWatch[key]; !ok {
		watchCtx, cancel := context.WithCancel(ctx)
		w.activeWatch[key] = cancel
		go w.startWatch(watchCtx, resource, namespace)
	}
	w.mu.Unlock()

	return sub
}

func (w *Watcher) Unsubscribe(sub *Subscriber) {
	key := watchKey(sub.Resource, sub.Namespace)
	w.mu.Lock()
	defer w.mu.Unlock()

	subs := w.subscribers[key]
	for i, s := range subs {
		if s == sub {
			w.subscribers[key] = append(subs[:i], subs[i+1:]...)
			break
		}
	}

	if len(w.subscribers[key]) == 0 {
		delete(w.subscribers, key)
		if cancel, ok := w.activeWatch[key]; ok {
			cancel()
			delete(w.activeWatch, key)
		}
	}
}

func (w *Watcher) startWatch(ctx context.Context, resource, namespace string) {
	gvr, err := ResolveGVR("", resource)
	if err != nil {
		log.Printf("watch: failed to resolve GVR for %s: %v", resource, err)
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		default:
		}

		var watcher watch.Interface
		if namespace != "" && namespace != "_all" {
			watcher, err = w.client.DynamicClient.Resource(gvr).Namespace(namespace).Watch(ctx, metav1.ListOptions{})
		} else {
			watcher, err = w.client.DynamicClient.Resource(gvr).Watch(ctx, metav1.ListOptions{})
		}
		if err != nil {
			log.Printf("watch: error watching %s/%s: %v", resource, namespace, err)
			return
		}

		w.processEvents(ctx, watcher, resource, namespace)
		watcher.Stop()
	}
}

func (w *Watcher) processEvents(ctx context.Context, watcher watch.Interface, resource, namespace string) {
	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-watcher.ResultChan():
			if !ok {
				return
			}

			obj, ok := event.Object.(*unstructured.Unstructured)
			if !ok {
				continue
			}

			we := WatchEvent{
				Type:      string(event.Type),
				Resource:  resource,
				Namespace: namespace,
				Object:    obj,
			}

			data, err := json.Marshal(we)
			if err != nil {
				log.Printf("watch: marshal error: %v", err)
				continue
			}

			w.broadcast(resource, namespace, data)
		}
	}
}

func (w *Watcher) broadcast(resource, namespace string, data []byte) {
	key := watchKey(resource, namespace)
	w.mu.RLock()
	defer w.mu.RUnlock()

	for _, sub := range w.subscribers[key] {
		select {
		case sub.Ch <- data:
		default:
			// Drop message if subscriber is too slow
		}
	}
}
