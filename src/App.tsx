import { memo } from "react";
import Header from "./components/Header/Header";
import "./App.module.scss";

const App = memo(() => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />
      <div className="flex-1 p-8">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Antigravity Tools
          </h1>
        </div>
      </div>
    </div>
  );
});

export default App;
