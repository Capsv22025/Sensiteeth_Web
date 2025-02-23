import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import styles from '../pages/DentistDashboard.module.css';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
    } else {
      navigate("/");
    }
  };

  const handleToggleSidebar = (e) => {
    e.preventDefault();
    toggleSidebar();
  };

  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
      <div className={styles.sidebarHeader}>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={handleToggleSidebar}
        >
          {isOpen ? '☰' : '➤'}
        </button>
        {isOpen && <h2 className={styles.sidebarTitle}>Dentist Portal</h2>}
      </div>
      {isOpen && (
        <ul className={styles.sidebarMenu}>
          <li className={styles.sidebarItem}>
            <Link to="/dentist-dashboard" className={styles.sidebarLink}>Dashboard</Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link to="/dentist-dashboard/consultations" className={styles.sidebarLink}>Consultations</Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link to="/dentist-dashboard/profile" className={styles.sidebarLink}>Profile</Link>
          </li>
          <li className={styles.sidebarItem} onClick={handleSignOut}>
            <span className={styles.sidebarLink}>Sign Out</span>
          </li>
        </ul>
      )}
    </div>
  );
};

export default Sidebar;