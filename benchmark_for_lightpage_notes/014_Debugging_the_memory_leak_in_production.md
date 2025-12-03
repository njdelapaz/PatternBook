# Debugging the memory leak in production

Spent all day tracking down a memory leak. Problem: App memory usage grew from 100MB to 2GB over 6 hours. Investigation: 1) Used Chrome DevTools heap profiler. 2) Found event listeners weren't being cleaned up. 3) Issue was in WebSocket connection handler - created new listener each reconnection but never removed old ones. Solution: Added proper cleanup in componentWillUnmount and connection.close(). Also implemented WeakMap for references. Memory now stable at 120MB. Lesson: Always clean up event listeners and subscriptions!
