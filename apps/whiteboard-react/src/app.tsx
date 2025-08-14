import { DebugPanel } from "@usketch/ui-components";
import { Toolbar } from "./components/toolbar";
import { Whiteboard } from "./components/whiteboard";
import "./styles/app.css";

function App() {
	return (
		<div className="app">
			<Toolbar />
			<Whiteboard />
			{import.meta.env.DEV && <DebugPanel />}
		</div>
	);
}

export default App;
