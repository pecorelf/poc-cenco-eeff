import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Sin StrictMode: evita dobles efectos en streaming SSE y animaciones.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
