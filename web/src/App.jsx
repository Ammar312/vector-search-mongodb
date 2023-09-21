import React from "react";
import CreatePost from "./components/CreatePost";
import Bar from "./components/Bar";

const App = () => {
  return (
    <div className=" p-2 min-h-screen bg-gradient-to-br from-[#ffb347] to-[#ffcc33]">
      <Bar />
      <CreatePost />
    </div>
  );
};

export default App;
