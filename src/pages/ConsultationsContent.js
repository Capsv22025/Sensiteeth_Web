import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import styles from "./DentistDashboard.module.css";

const ConsultationsContent = ({ dentistId }) => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState([]);
  const [currentDiagnosis, setCurrentDiagnosis] = useState(null);
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [finalDiagnosisDesc, setFinalDiagnosisDesc] = useState("");
  const [dentistDiagnosis, setDentistDiagnosis] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [appointmentToReject, setAppointmentToReject] = useState(null);
  const [viewReasonModalOpen, setViewReasonModalOpen] = useState(false);
  const [reasonToView, setReasonToView] = useState("");
  const recordsPerPage = 10;

  const SUPABASE_STORAGE_URL = "https://snvrykahnydcsdvfwfbw.supabase.co/storage/v1/object/public/";

  useEffect(() => {
    const fetchUserRoleAndConsultations = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("No user session found.");
          setLoading(false);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from("Users")
          .select("role")
          .eq("email", session.user.email)
          .single();

        if (userError || !userData) {
          console.error("Error fetching user role:", userError);
          setError("Unable to fetch user role.");
          setLoading(false);
          return;
        }

        const role = userData.role.toLowerCase();
        setUserRole(role);
        console.log("Fetched user role:", role);
        console.log("User email:", session.user.email);

        const { data: consultationData, error: consultationError } = await supabase
          .from("Consultation")
          .select("*, Patient(FirstName, LastName), Diagnosis(id, ConsultationId, InitialDiagnosis, FinalDiagnosis, FinalDiagnosisDesc, DentistDiagnosis, Accuracy, Confidence, ImageUrl, JawPosition, ToothType)")
          .eq("DentistId", dentistId)
          .order("AppointmentDate", { ascending: true });

        if (consultationError) {
          console.error("Error fetching consultations:", consultationError);
          setError("Failed to load consultations.");
          setLoading(false);
          return;
        }

        setAppointments(consultationData);
        setFilteredAppointments(consultationData);
        console.log("Fetched Appointments:", consultationData);
        setLoading(false);
      } catch (err) {
        console.error("Unexpected error in fetchUserRoleAndConsultations:", err);
        setError("An unexpected error occurred.");
        setLoading(false);
      }
    };

    if (dentistId) {
      fetchUserRoleAndConsultations();
    } else {
      setError("Dentist ID not provided.");
      setLoading(false);
    }
  }, [dentistId]);

  useEffect(() => {
    let filtered = appointments;

    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (appointment) => appointment.Status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((appointment) => {
        const fullName = `${appointment.Patient.FirstName} ${appointment.Patient.LastName}`.toLowerCase();
        return fullName.includes(searchLower);
      });
    }

    setFilteredAppointments(filtered);
    setCurrentPage(1);
  }, [statusFilter, searchTerm, appointments]);

  const handleApprove = async (appointmentId) => {
    try {
      const { data, error } = await supabase
        .from("Consultation")
        .update({ Status: "approved" })
        .eq("id", appointmentId)
        .select();

      if (error) throw new Error(`Error approving consultation: ${error.message}`);
      console.log("Consultation approved successfully:", data);
      await refreshAppointments();
    } catch (error) {
      console.error("Approve error:", error.message);
      setError(`An error occurred: ${error.message}`);
    }
  };

  const openRejectModal = (appointmentId) => {
    setAppointmentToReject(appointmentId);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!appointmentToReject || !rejectionReason.trim()) {
      setError("Please provide a reason for rejection.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("Consultation")
        .update({
          Status: "rejected",
          followupdate: null,
          rejection_reason: rejectionReason.trim(),
          FollowUpReason: null,
        })
        .eq("id", appointmentToReject)
        .select();

      if (error) throw new Error(`Error rejecting consultation: ${error.message}`);
      console.log("Consultation rejected successfully:", data);
      await refreshAppointments();
      setRejectModalOpen(false);
      setAppointmentToReject(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Reject error:", error.message);
      setError(`An error occurred: ${error.message}`);
    }
  };

  const handleSetComplete = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to mark this consultation as complete?")) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("Consultation")
        .update({ 
          Status: "complete", 
          followupdate: null,
          FollowUpReason: null
        })
        .eq("id", appointmentId)
        .select();

      if (error) throw new Error(`Error setting consultation to complete: ${error.message}`);
      console.log("Consultation set to complete successfully:", data);
      await refreshAppointments();
    } catch (error) {
      console.error("Set complete error:", error.message);
      setError(`An error occurred: ${error.message}`);
    }
  };

  const refreshAppointments = async () => {
    try {
      const { data: updatedAppointments, error: refreshError } = await supabase
        .from("Consultation")
        .select("*, Patient(FirstName, LastName), Diagnosis(id, ConsultationId, InitialDiagnosis, FinalDiagnosis, FinalDiagnosisDesc, DentistDiagnosis, Accuracy, Confidence, ImageUrl, JawPosition, ToothType)")
        .eq("DentistId", dentistId)
        .order("AppointmentDate", { ascending: true });

      if (refreshError) {
        console.error("Error refreshing appointments:", refreshError);
        setError("Failed to refresh consultations.");
        return;
      }

      setAppointments(updatedAppointments);
    } catch (error) {
      console.error("Refresh error:", error.message);
      setError("Failed to refresh consultations.");
    }
  };

  const handleViewDiagnosis = (diagnoses) => {
    if (diagnoses && diagnoses.length > 0) {
      const sortedDiagnoses = diagnoses.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB - dateA || b.id - a.id;
      });
      setSelectedDiagnoses(sortedDiagnoses);
      setCurrentDiagnosis(sortedDiagnoses[0]);
      setFinalDiagnosis(sortedDiagnoses[0].FinalDiagnosis || "");
      setFinalDiagnosisDesc(sortedDiagnoses[0].FinalDiagnosisDesc || "");
      setDentistDiagnosis(sortedDiagnoses[0].DentistDiagnosis || "");
      setImageError(false);
      console.log("Opening modal with Diagnoses:", sortedDiagnoses);
      setIsModalOpen(true);
    } else {
      console.log("No diagnosis available to view/edit.");
    }
  };

  const handleSelectDiagnosis = (diagnosis) => {
    setCurrentDiagnosis(diagnosis);
    setFinalDiagnosis(diagnosis.FinalDiagnosis || "");
    setFinalDiagnosisDesc(diagnosis.FinalDiagnosisDesc || "");
    setDentistDiagnosis(diagnosis.DentistDiagnosis || "");
    setImageError(false);
  };

  const handleUpdateDiagnosis = async () => {
    if (!currentDiagnosis) return;

    try {
      const { data: diagnosisData, error: diagnosisError } = await supabase
        .from("Diagnosis")
        .update({
          FinalDiagnosis: finalDiagnosis,
          FinalDiagnosisDesc: finalDiagnosisDesc,
          DentistDiagnosis: dentistDiagnosis || null,
        })
        .eq("id", currentDiagnosis.id)
        .select();

      if (diagnosisError) {
        console.error("Update diagnosis error:", diagnosisError);
        throw new Error(`Error updating diagnosis: ${diagnosisError.message}`);
      }
      console.log("Diagnosis updated successfully:", diagnosisData);

      await refreshAppointments();
      setIsModalOpen(false);
      setSelectedDiagnoses([]);
      setCurrentDiagnosis(null);
      setFinalDiagnosis("");
      setFinalDiagnosisDesc("");
      setDentistDiagnosis("");
    } catch (error) {
      console.error("Update error:", error.message);
      setError(`An error occurred: ${error.message}`);
    }
  };

  const handleSetFollowUp = (appointment) => {
    setSelectedConsultation(appointment);
    setFollowUpDate(appointment.followupdate ? new Date(appointment.followupdate).toISOString().slice(0, 16) : "");
    setFollowUpReason(appointment.FollowUpReason || "");
    setFollowUpModalOpen(true);
  };

  const handleSaveFollowUp = async () => {
    if (!selectedConsultation) return;

    try {
      const { data, error } = await supabase
        .from("Consultation")
        .update({
          followupdate: followUpDate ? new Date(followUpDate).toISOString() : null,
          FollowUpReason: followUpReason.trim() || null,
          Status: "follow-up",
        })
        .eq("id", selectedConsultation.id)
        .select();

      if (error) throw new Error(`Error setting follow-up date: ${error.message}`);
      console.log("Follow-up date and reason updated successfully:", data);
      await refreshAppointments();
      setFollowUpModalOpen(false);
      setSelectedConsultation(null);
      setFollowUpDate("");
      setFollowUpReason("");
    } catch (error) {
      console.error("Follow-up error:", error.message);
      setError(`An error occurred: ${error.message}`);
    }
  };

  const handleViewRejectionReason = (reason) => {
    setReasonToView(reason || "No reason provided.");
    setViewReasonModalOpen(true);
  };

  const handleImageError = () => {
    setImageError(true);
    console.error("Image failed to load:", currentDiagnosis?.ImageUrl);
  };

  const getFullImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${SUPABASE_STORAGE_URL}${url}`;
  };

  const totalRecords = filteredAppointments.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredAppointments.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return <div>Loading consultations...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <section className={styles.section}>
      <h1 className={styles.title}>
        <span className={styles.wordPrimary}>Dentist</span>{" "}
        <span className={styles.wordAccent}>Consultations</span>
      </h1>
      <div className={styles.filterContainer}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel1} htmlFor="statusFilter">Filter by Status: </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="partially complete">Partially Complete</option>
            <option value="complete">Complete</option>
            <option value="follow-up">Follow-Up</option>
          </select>
        </div>
        <div className={styles.searchGroup}>
          <label className={styles.filterLabel2} htmlFor="patientSearch">Search by Patient Name: </label>
          <input
            id="patientSearch"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter patient name..."
            className={styles.searchInput}
          />
        </div>
      </div>
      {filteredAppointments.length > 0 ? (
        <>
          <table className={styles.appointmentTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Status</th>
                <th>Follow-Up Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((appointment) => {
                const statusLower = appointment.Status.toLowerCase();
                const canViewDiagnosis = ["partially complete", "complete", "follow-up"].includes(statusLower);
                const canSetComplete = statusLower === "follow-up" || statusLower === "partially complete";
                return (
                  <tr key={appointment.id}>
                    <td>
                      {new Date(appointment.AppointmentDate).toLocaleString("en-PH", {
                        timeZone: "Asia/Manila",
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                        hour: "numeric",
                        minute: "numeric",
                        hour12: true,
                      })}
                    </td>
                    <td>{`${appointment.Patient.FirstName} ${appointment.Patient.LastName}`}</td>
                    <td>{appointment.Status}</td>
                    <td>
                      {appointment.followupdate
                        ? new Date(appointment.followupdate).toLocaleString("en-PH", {
                            timeZone: "Asia/Manila",
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                            hour12: true,
                          })
                        : "Not set"}
                    </td>
                    <td>
                      {(userRole === "dentist" || userRole === "secretary") &&
                        appointment.Status === "pending" && (
                          <>
                            <button
                              className={styles.actionButton}
                              onClick={() => handleApprove(appointment.id)}
                            >
                              Approve
                            </button>
                            <button
                              className={styles.actionButton}
                              onClick={() => openRejectModal(appointment.id)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      {userRole === "dentist" &&
                        appointment.Diagnosis &&
                        appointment.Diagnosis.length > 0 &&
                        canViewDiagnosis && (
                          <button
                            className={styles.actionButton}
                            onClick={() => handleViewDiagnosis(appointment.Diagnosis)}
                          >
                            View/Edit Diagnosis
                          </button>
                        )}
                      {(userRole === "dentist" || userRole === "secretary") &&
                        appointment.Status === "partially complete" && (
                          <button
                            className={styles.actionButton}
                            onClick={() => handleSetFollowUp(appointment)}
                          >
                            Set Follow-Up
                          </button>
                        )}
                      {(userRole === "dentist" || userRole === "secretary") &&
                        canSetComplete && (
                          <button
                            className={styles.actionButton}
                            onClick={() => handleSetComplete(appointment.id)}
                          >
                            Set to Complete
                          </button>
                        )}
                      {(userRole === "dentist" || userRole === "secretary") &&
                        appointment.Status === "rejected" && (
                          <button
                            className={styles.actionButton}
                            onClick={() => handleViewRejectionReason(appointment.rejection_reason)}
                          >
                            View Reason
                          </button>
                        )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className={styles.paginationContainer}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles.paginationButton}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`${styles.paginationButton} ${
                  currentPage === page ? styles.paginationButtonActive : ""
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={styles.paginationButton}
            >
              Next
            </button>
          </div>
          <div className={styles.paginationInfo}>
            Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {totalRecords} records
          </div>
        </>
      ) : (
        <p>No consultations match your criteria.</p>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <h1 className={styles.title}>
              <span className={styles.wordPrimary}>Diagnosis</span>{" "}
              <span className={styles.wordAccent}>History</span>
            </h1>
            {selectedDiagnoses && selectedDiagnoses.length > 0 ? (
              <>
                <div className={styles.diagnosisSelect} style={{ marginBottom: "20px" }}>
                  <label>
                    <strong>Select Diagnosis Record:</strong>
                    <select
                      className={styles.filterSelect}
                      value={currentDiagnosis?.id || ""}
                      onChange={(e) => {
                        const selected = selectedDiagnoses.find((d) => d.id === parseInt(e.target.value));
                        handleSelectDiagnosis(selected);
                      }}
                      style={{ marginLeft: "10px", padding: "5px", width: "100%", maxWidth: "400px" }}
                    >
                      {selectedDiagnoses.map((diagnosis) => (
                        <option key={diagnosis.id} value={diagnosis.id}>
                          {`Diagnosis #${diagnosis.id} - ${diagnosis.InitialDiagnosis || "No Diagnosis"}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <hr className={styles.modalDivider} />
                {currentDiagnosis && (
                  <div className={styles.modalcont}>
                    <div className={styles.txtfieldcont}>
                      <p>
                        <strong>Diagnosis ID:</strong> {currentDiagnosis.id}
                      </p>
                      <p>
                        <strong>System Diagnosis:</strong>{" "}
                        {currentDiagnosis.InitialDiagnosis || "Not specified"}
                      </p>
                      <p>
                        <strong>Jaw Position:</strong>{" "}
                        {currentDiagnosis.JawPosition || "Not specified"}
                      </p>
                      <p>
                        <strong>Tooth Type:</strong>{" "}
                        {currentDiagnosis.ToothType || "Not specified"}
                      </p>
                      <p>
                        <strong>Confidence:</strong>{" "}
                        {(currentDiagnosis.Confidence * 100).toFixed(2)}%
                      </p>
                      <label>
                        Dentist Diagnosis (optional):
                        <select
                          value={dentistDiagnosis}
                          onChange={(e) => setDentistDiagnosis(e.target.value)}
                          className={styles.filterSelect}
                          style={{ width: "100%", padding: "5px", marginTop: "5px" }}
                        >
                          <option value="">-- Select Diagnosis --</option>
                          <option value="Tooth decay">Tooth decay</option>
                          <option value="Gum disease">Gum disease</option>
                          <option value="Gingivitis">Gingivitis</option>
                          <option value="Tooth Erosion">Tooth Erosion</option>
                          <option value="Tooth Sensitivity">Tooth Sensitivity</option>
                          <option value="Cracked or fractured teeth">Cracked or fractured teeth</option>
                          <option value="Malocclusion">Malocclusion</option>
                          <option value="Tooth Abcess">Tooth Abcess</option>
                          <option value="Impacted Tooth">Impacted Tooth</option>
                        </select>
                      </label>
                      <label>
                        Additional Diagnosis (optional):
                        <input
                          type="text"
                          value={finalDiagnosis}
                          onChange={(e) => setFinalDiagnosis(e.target.value)}
                          className={styles.inputField}
                        />
                      </label>
                      <label>
                        Additional Diagnosis Description (optional):
                        <textarea
                          value={finalDiagnosisDesc}
                          onChange={(e) => setFinalDiagnosisDesc(e.target.value)}
                          className={styles.textareaField}
                        />
                      </label>
                    </div>
                    <div className={styles.imgcont}>
                      {imageError ? (
                        <p style={{ color: "red" }}>
                          Unable to load image. URL: {getFullImageUrl(currentDiagnosis.ImageUrl)}
                        </p>
                      ) : (
                        <img
                          src={getFullImageUrl(currentDiagnosis.ImageUrl)}
                          alt="Diagnosis"
                          style={{ maxWidth: "100%", height: "auto", borderRadius: "8px" }}
                          onError={handleImageError}
                          onLoad={() => console.log("Image loaded successfully")}
                        />
                      )}
                    </div>
                  </div>
                )}
                <div className={styles.modalButtons}>
                  <button className={styles.actionButton} onClick={handleUpdateDiagnosis}>
                    Save
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedDiagnoses([]);
                      setCurrentDiagnosis(null);
                      setDentistDiagnosis("");
                    }}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <p>No diagnoses available.</p>
            )}
          </div>
        </div>
      )}

      {followUpModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h1 className={styles.title}>
              <span className={styles.wordPrimary}>Set Follow-Up</span>{" "}
              <span className={styles.wordAccent}>Date</span>
            </h1>
            <div className={styles.modalcont}>
              <label className={styles.followupDate}>
                Follow-Up Date:
                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className={styles.inputField}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </label>
              <label>
                Follow-Up Reason:
                <textarea
                  value={followUpReason}
                  onChange={(e) => setFollowUpReason(e.target.value)}
                  className={styles.textareaField}
                  placeholder="Enter the reason for the follow-up (optional)"
                />
              </label>
            </div>
            <div className={styles.modalButtons}>
              <button className={styles.actionButton} onClick={handleSaveFollowUp}>
                Save
              </button>
              <button
                className={styles.actionButton}
                onClick={() => {
                  setFollowUpModalOpen(false);
                  setFollowUpReason("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Reject Consultation</h3>
            <div className={styles.modalcont}>
              <label>
                Reason for Rejection (required):
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className={styles.textareaField}
                  placeholder="Please provide a reason for rejecting this consultation"
                  required
                />
              </label>
            </div>
            <div className={styles.modalButtons}>
              <button
                className={styles.actionButton}
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
              >
                Confirm Rejection
              </button>
              <button
                className={styles.actionButton}
                onClick={() => {
                  setRejectModalOpen(false);
                  setAppointmentToReject(null);
                  setRejectionReason("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {viewReasonModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h1 className={styles.title}>
              <span className={styles.wordPrimary}>Rejection</span>{" "}
              <span className={styles.wordAccent}>Reason</span>
            </h1>
            <div className={styles.modalcont}>
              <p className={styles.rejectionReason}>{reasonToView}</p>
            </div>
            <div className={styles.modalButtons}>
              <button
                className={styles.actionButton}
                onClick={() => {
                  setViewReasonModalOpen(false);
                  setReasonToView("");
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ConsultationsContent;