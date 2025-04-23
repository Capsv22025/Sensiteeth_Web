import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import styles from "./Login.module.css";
import "../styles/Global.css";
import logo from "../assets/header-logo.png";
import image1 from "../assets/carousel1.jpg";
import image2 from "../assets/carousel2.jpg";
import image3 from "../assets/carousel3.jpg";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      console.error("Authentication error:", authError.message);
      return;
    }

    if (!authData.user.confirmed_at) {
      setLoading(false);
      setError("Please confirm your email before logging in.");
      console.error("User email not confirmed:", email);
      return;
    }

    const { data: userData, error: userError } = await supabase
      .from("Users")
      .select("role")
      .eq("email", email)
      .single();

    setLoading(false);

    if (userError || !userData) {
      setError("User role not found. Please contact support.");
      console.error("Users table error:", userError?.message, "Email:", email);
      return;
    }

    const role = userData.role ? userData.role.trim().toLowerCase() : null;
    console.log("User role fetched:", role);

    if (role === "patient") {
      console.log("Navigating to /patient-dashboard");
      navigate("/patient-dashboard");
    } else if (role === "dentist") {
      console.log("Navigating to /dentist-dashboard");
      navigate("/dentist-dashboard");
    } else if (role === "secretary") {
      console.log("Navigating to /dentist-dashboard for secretary");
      navigate("/dentist-dashboard");
    } else {
      setError("User role not recognized.");
      console.error("Unrecognized role:", role);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logoContainer}>
        <img src={logo} alt="Logo" className={styles.logo} />
      </div>
      <div className={styles.leftColumn}>
        <div className={styles.card}>
          <p className={styles.preTitle}>Welcome Back</p>
          <hr className={styles.divider} />
          <h2 className={styles.title}>
            <span className={styles.wordPrimary}>Sign In To Your</span>{" "}
            <span className={styles.wordAccent}>Account</span>
          </h2>
          <form onSubmit={handleLogin} className={styles.form}>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.inputGroup}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
              />
            </div>
            <button type="submit" className={styles.buttonFilledPrimary} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
      <div className={styles.rightColumn}>
        <div className={styles.carousel}>
          <img src={image1} alt="Carousel 1" className={styles.carouselImage} />
          <img src={image2} alt="Carousel 2" className={styles.carouselImage} />
          <img src={image3} alt="Carousel 3" className={styles.carouselImage} />
        </div>
      </div>
    </div>
  );
};

export default Login;
