---
lang: en
title: 'Extension life cycle'
keywords: LoopBack 4.0, LoopBack 4
sidebar: lb4_sidebar
permalink: /doc/en/lb4/Extension-life-cycle.html
---

## Extension life cycle

As described in [Life cycle](Life-cycle.md), a LoopBack
[Application](Application.md) has its own life cycles at runtime. Corresponding
events such as `start` and `stop` are emitted upon the state change.

Extension modules for LoopBack often contribute artifacts such as servers,
datasources, and connectors to the application. They typically provide a
component to bind such artifacts to the context together. Being able to listen
on life cycle events is important for extension modules to collaborate with the
application.

An extension module follows the same way as applications to implement and
register life cycle observers.

### Implement a life cycle observer

A life cycle observer class optionally implements `start` and `stop` methods to
be invoked upon `start` and `stop` events.

```ts
import {LifeCycleObserver} from '@loopback/core';

export class MyLifeCycleObserver implements LifeCycleObserver {
  start() {
    // It can return `void` or `Promise<void>`
  }
  stop() {
    // It can return `void` or `Promise<void>`
  }
}
```

A life cycle observer can be tagged with `CoreTags.LIFE_CYCLE_OBSERVER_GROUP` to
indicate its group to be invoked for ordering. We can decorate the observer
class with `@bind` to provide more metadata for the binding.

```ts
import {bind, createBindingFromClass} from '@loopback/context';
import {CoreTags, asLifeCycleObserver} from '@loopback/core';

@bind(
  {
    tags: {
      [CoreTags.LIFE_CYCLE_OBSERVER_GROUP]: 'g1',
    },
  },
  asLifeCycleObserver,
)
export class MyLifeCycleObserver {
  // ...
}
```

### Register a life cycle observer

A life cycle observer can be registered by calling `lifeCycleObserver()` of the
application. It binds the observer to the application context with a special
tag - `CoreTags.LIFE_CYCLE_OBSERVER`.

```ts
app.lifeCycleObserver(MyObserver);
```

Life cycle observers can be registered via a component too:

```ts
export class MyComponentWithObservers {
  lifeCycleObservers = [XObserver, YObserver];
}
```
