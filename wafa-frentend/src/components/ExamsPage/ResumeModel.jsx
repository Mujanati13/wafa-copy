import React from "react";

const ResumeModel = () => {
  return (
      <div className="fixed inset-0 bg-black/50 text-foreground p-4 flex items-center justify-center z-[99999]">
         <div className="w-full max-w-3xl h-[250px] bg-card text-card-foreground border border-border rounded-3xl flex flex-col items-center justify-start relative shadow-md p-6">
        <button
          className="flex items-center gap-2 mt-6 px-4 py-1.5 border border-border rounded-full bg-background text-foreground hover:bg-accent transition-colors shadow-sm"
        >
          <span className="text-blue-500 dark:text-blue-400 text-xl font-bold">+</span>
          <span className="text-sm">ajouter un resume</span>
        </button>
      </div>
      </div>
  );
};

export default ResumeModel;
