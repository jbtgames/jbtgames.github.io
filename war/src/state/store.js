export const createStore = (initialState = {}) => {
  let state = structuredClone(initialState);
  const listeners = new Map();
  let idCounter = 0;

  const getState = () => structuredClone(state);

  const setState = (updater) => {
    const nextState = typeof updater === "function" ? updater(getState()) : updater;
    state = Object.freeze({ ...state, ...nextState });
    listeners.forEach((callback) => callback(getState()));
  };

  const subscribe = (callback) => {
    const id = ++idCounter;
    listeners.set(id, callback);
    callback(getState());
    return () => listeners.delete(id);
  };

  return Object.freeze({ getState, setState, subscribe });
};
