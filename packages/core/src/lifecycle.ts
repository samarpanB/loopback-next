// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/core
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {
  bind,
  Binding,
  BindingScope,
  Constructor,
  ValueOrPromise,
} from '@loopback/context';
import {CoreBindings, CoreTags} from './keys';

/**
 * Observers to handle life cycle start/stop events
 */
export interface LifeCycleObserver {
  /**
   * The method to be invoked during `start`
   */
  start?(): ValueOrPromise<void>;
  /**
   * The method to be invoked during `stop`
   */
  stop?(): ValueOrPromise<void>;
}

const lifeCycleMethods: (keyof LifeCycleObserver)[] = ['start', 'stop'];

/**
 * Test if an object implements LifeCycleObserver
 * @param obj An object
 */
export function isLifeCycleObserver(obj: {
  [name: string]: unknown;
}): obj is LifeCycleObserver {
  return lifeCycleMethods.some(m => typeof obj[m] === 'function');
}

/**
 * Test if a class implements LifeCycleObserver
 * @param ctor A class
 */
export function isLifeCycleObserverClass(
  ctor: Constructor<unknown>,
): ctor is Constructor<LifeCycleObserver> {
  return ctor.prototype && isLifeCycleObserver(ctor.prototype);
}

/**
 * Configure the binding as life cycle observer
 * @param binding Binding
 */
export function asLifeCycleObserver<T = unknown>(binding: Binding<T>) {
  return binding
    .tag(CoreTags.LIFE_CYCLE_OBSERVER)
    .tag({namespace: CoreBindings.LIFE_CYCLE_OBSERVERS});
}

/**
 * Find all life cycle observer bindings. By default, a binding tagged with
 * `CoreTags.LIFE_CYCLE_OBSERVER`. It's used as `BindingFilter`.
 */
export function lifeCycleObserverFilter(binding: Binding<unknown>): boolean {
  return binding.tagMap[CoreTags.LIFE_CYCLE_OBSERVER] != null;
}

/**
 * Sugar decorator to mark a class as life cycle observer
 * @param group Optional observer group name
 * @param scope Optional binding scope
 */
export function lifeCycleObserver(group = '', scope?: BindingScope) {
  return bind(asLifeCycleObserver, {
    tags: {
      [CoreTags.LIFE_CYCLE_OBSERVER_GROUP]: group,
    },
    scope,
  });
}
