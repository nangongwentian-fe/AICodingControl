import React from "react";
import styles from "./Header.module.scss";

const Header: React.FC = () => {
  // 双击处理函数
  const handleDoubleClick = () => {
    if (window.electronAPI?.maximizeWindow) {
      window.electronAPI.maximizeWindow();
    }
  };

  return (
    <div
      className={styles.customHeader}
      onDoubleClick={handleDoubleClick}
    ></div>
  );
};

export default Header;
