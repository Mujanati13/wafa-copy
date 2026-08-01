import React from "react";

const IconWithTooltip = ({ Icon, label }) => {
  return (
    <div className="relative group rounded-full bg-card dark:bg-slate-800 h-7 w-7 flex items-center justify-center">
      <Icon className="cursor-pointer w-5 text-blue-500 dark:text-blue-400" />
      <span className="absolute top-1/2 -translate-y-1/2 right-[36px] px-3 py-1 text-sm text-white bg-slate-800 dark:bg-slate-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg z-10">
        {label}
      </span>
    </div>
  );
};

export default IconWithTooltip;
