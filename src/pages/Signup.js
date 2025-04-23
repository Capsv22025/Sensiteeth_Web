import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import styles from "./Signup.module.css";
import "../styles/Global.css";
import icon from "../assets/icon.png";

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "dentist",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    const { email, password, confirmPassword, role } = formData;

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const { data: { user }, error: signUpError } = await supabase.auth.signUp(
        { email, password },
        { data: { role } }
      );

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      if (!user) {
        throw new Error("Signup failed: No user returned.");
      }

      console.log("Auth signup successful:", user);

      const { error: userInsertError } = await supabase
        .from("Users")
        .insert([{ email, role }]);

      if (userInsertError) {
        throw new Error(`Users table insert failed: ${userInsertError.message}`);
      }

      console.log("Users table insert successful");

      if (role === "patient") {
        const { error: patientInsertError } = await supabase
          .from("Patient")
          .insert([{ Email: email }]);

        if (patientInsertError) {
          throw new Error(`Patient table insert failed: ${patientInsertError.message}`);
        }
        console.log("Patient email inserted successfully");
      } else if (role === "dentist") {
        const { error: dentistInsertError } = await supabase
          .from("Dentist")
          .insert([{ Email: email }]);

        if (dentistInsertError) {
          throw new Error(`Dentist table insert failed: ${dentistInsertError.message}`);
        }
        console.log("Dentist email inserted successfully");
      }

      setLoading(false);
      alert("Signup successful! Please check your email to verify your account, then sign in.");
      navigate("/");

    } catch (error) {
      console.error("Signup error:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
      <div className={styles.logoContainer}>
        <img src={icon} alt="icon" className={styles.icon} />
      </div>
          <hr className={styles.divider} />
          <h2 className={styles.title}>
            <span className={styles.wordPrimary}>Create An</span>{" "}
            <span className={styles.wordAccent}>Account</span>
          </h2>
        <form onSubmit={handleSignup}>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.inputGroup}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          <button type="submit" className={styles.buttonFilledPrimary} disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;