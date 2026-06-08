import { createBrowserRouter } from '../node_modules/react-router-dom/dist/index.js';
const router = createBrowserRouter([{ path: '/', element: null }], { future: { v7_startTransition: true, v7_relativeSplatPath: true } });
console.log(router.future);
