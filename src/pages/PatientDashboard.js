import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import styles from './PatientDashboard.module.css';
import AppointmentModal from "./AppointmentModal";
import logo from "../assets/light-logo.png";

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [completedConsultations, setCompletedConsultations] = useState([]);
  const [patientHistory, setPatientHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState([]);
  const [currentDiagnosis, setCurrentDiagnosis] = useState(null);
  const [dentists, setDentists] = useState([]);
  const [dentistAvailability, setDentistAvailability] = useState([]);
  const [allDentistAppointments, setAllDentistAppointments] = useState([]); // New state for all dentist appointments
  const [patientId, setPatientId] = useState(null);
  const [email, setEmail] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [followUpNotifications, setFollowUpNotifications] = useState([]);
  const [currentPageAppointments, setCurrentPageAppointments] = useState(1);
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const [viewReasonModalOpen, setViewReasonModalOpen] = useState(false);
  const [reasonToView, setReasonToView] = useState("");
  const [viewFollowUpReasonModalOpen, setViewFollowUpReasonModalOpen] = useState(false);
  const [followUpDetailsToView, setFollowUpDetailsToView] = useState({ reason: "", date: "" });
  const appointmentsPerPage = 6;
  const historyPerPage = 3;

  const SUPABASE_STORAGE_URL = 'https://snvrykahnydcsdvfwfbw.supabase.co/storage/v1/object/public/';

  // Helper function to convert UTC to Philippine Time (UTC+8) and format date-time
  const formatDateTimePhilippine = (utcDateString) => {
    const utcDate = new Date(utcDateString);
    return utcDate.toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  useEffect(() => {
    const fetchUserAndData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("Error getting session:", sessionError);
        navigate('/');
        return;
      }

      setEmail(session.user.email);

      const { data: patientData, error: patientError } = await supabase
        .from('Patient')
        .select('id, FirstName, MiddleName, LastName, Age, BirthDate, Email, Address, Gender, ContactNo')
        .eq('Email', session.user.email)
        .single();

      if (patientError) {
        console.error("Error fetching patient data:", patientError);
        if (patientError.code === 'PGRST116') {
          console.log("No patient record found for this email.");
        }
        return;
      }

      const currentPatientId = patientData.id;
      setPatientId(currentPatientId);
      setPatientData(patientData);
      console.log('Fetched Patient Data:', patientData);

      const { data: allConsultations, error: allConsultationsError } = await supabase
        .from('Consultation')
        .select('*, Dentist(DentistName), Diagnosis(*)')
        .eq('PatientId', currentPatientId)
        .order('AppointmentDate', { ascending: true });

      if (allConsultationsError) {
        console.error("Error fetching all consultations:", allConsultationsError);
      } else {
        console.log("Raw Consultations from Supabase:", allConsultations.map(c => ({
          id: c.id,
          AppointmentDate: c.AppointmentDate,
        })));

        const consultationsWithStatus = allConsultations.map((consultation, index, arr) => {
          const priorConsultations = arr.slice(0, index).filter(
            (c) => c.PatientId === consultation.PatientId
          );
          const patientStatus = priorConsultations.length === 0 ? "new" : "returning";
          return { ...consultation, patientStatus };
        });

        const activeConsultations = consultationsWithStatus.filter(
          (consultation) => consultation.Status !== 'complete'
        );
        const completedConsultations = consultationsWithStatus.filter(
          (consultation) => consultation.Status === 'complete'
        );

        setAppointments(activeConsultations);
        console.log('Fetched Active Appointments:', activeConsultations);
        setCompletedConsultations(completedConsultations);
        console.log('Fetched Completed Consultations:', completedConsultations);

        const today = new Date();
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);
        const notifications = consultationsWithStatus
          .filter((consultation) => consultation.followupdate)
          .map((consultation) => {
            const followUpDate = new Date(consultation.followupdate);
            if (followUpDate >= today && followUpDate <= sevenDaysFromNow) {
              return {
                consultationId: consultation.id,
                followUpDate: followUpDate,
                dentistName: consultation.Dentist.DentistName,
                appointmentTime: formatDateTimePhilippine(consultation.AppointmentDate),
              };
            }
            return null;
          })
          .filter((notification) => notification !== null);

        setFollowUpNotifications(notifications);
        console.log('Follow-Up Notifications:', notifications);
      }

      const { data: historyData, error: historyError } = await supabase
        .from('patient_history')
        .select('*')
        .eq('patient_id', currentPatientId);
      if (historyError) {
        console.error("Error fetching patient history:", historyError);
      } else {
        setPatientHistory(historyData);
      }

      const { data: dentistsData, error: dentistsError } = await supabase
        .from('Dentist')
        .select('id, DentistName');
      if (dentistsError) {
        console.error("Error fetching dentists:", dentistsError);
      } else {
        setDentists(dentistsData);
        console.log('Fetched Dentists:', dentistsData);
      }

      const { data: availabilityData, error: availabilityError } = await supabase
        .from('DentistAvailability')
        .select('DentistId, Date, IsAvailable')
        .gte('Date', new Date().toISOString().split('T')[0]);

      if (availabilityError) {
        console.error("Error fetching dentist availability:", availabilityError);
      } else {
        setDentistAvailability(availabilityData || []);
        console.log('Fetched Dentist Availability:', availabilityData);
      }

      // Fetch all appointments for all dentists (to determine unavailable slots)
      const { data: allAppointmentsData, error: allAppointmentsError } = await supabase
        .from('Consultation')
        .select('DentistId, AppointmentDate, Status')
        .in('Status', ['approved', 'In Consultation']);

      if (allAppointmentsError) {
        console.error("Error fetching all dentist appointments:", allAppointmentsError);
      } else {
        setAllDentistAppointments(allAppointmentsData || []);
        console.log('Fetched All Dentist Appointments:', allAppointmentsData);
      }
    };

    fetchUserAndData();
  }, [navigate]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
    } else {
      console.log("Sign out successful, redirecting to /PatientLogin");
      navigate("/PatientLogin");
    }
  };

  const openModal = (appointment = null) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  const openDiagnosisModal = (diagnoses) => {
    if (diagnoses && diagnoses.length > 0) {
      const sortedDiagnoses = diagnoses.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB - dateA || b.id - a.id;
      });
      setSelectedDiagnoses(sortedDiagnoses);
      setCurrentDiagnosis(sortedDiagnoses[0]);
      setImageError(false);
      setIsDiagnosisModalOpen(true);
    } else {
      alert("No diagnosis record found for this consultation.");
    }
  };

  const closeDiagnosisModal = () => {
    setIsDiagnosisModalOpen(false);
    setSelectedDiagnoses([]);
    setCurrentDiagnosis(null);
  };

  const handleSelectDiagnosis = (diagnosis) => {
    setCurrentDiagnosis(diagnosis);
    setImageError(false);
  };

  const handleSubmit = async (formData) => {
    console.log('Received formData:', formData);

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(formData.AppointmentDate);
    if (appointmentDate < currentDate) {
      alert("Appointment date cannot be earlier than today.");
      return;
    }

    try {
      const patientDataToSave = {
        FirstName: formData.FirstName,
        MiddleName: formData.MiddleName,
        LastName: formData.LastName,
        Age: formData.Age,
        BirthDate: formData.BirthDate,
        Email: formData.Email,
        Address: formData.Address,
        Gender: formData.Gender,
        ContactNo: formData.ContactNo,
      };

      console.log('Patient data to save:', patientDataToSave);

      const { data: existingPatient, error: fetchError } = await supabase
        .from('Patient')
        .select('id')
        .eq('Email', formData.Email)
        .single();

      let patientIdToUse;

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing patient:', fetchError);
        throw new Error(`Error checking patient: ${fetchError.message}`);
      }

      if (existingPatient) {
        const { data: updatedPatient, error: updateError } = await supabase
          .from('Patient')
          .update(patientDataToSave)
          .eq('id', existingPatient.id)
          .select();
        
        if (updateError) {
          console.error('Patient update error:', updateError);
          throw new Error(`Error updating patient: ${updateError.message}`);
        }
        console.log("Patient updated successfully:", updatedPatient);
        patientIdToUse = updatedPatient[0].id;
      } else {
        const { data: newPatient, error: insertError } = await supabase
          .from('Patient')
          .insert([patientDataToSave])
          .select();
        
        if (insertError) {
          console.error('Patient insert error:', insertError);
          throw new Error(`Error inserting patient: ${insertError.message}`);
        }
        console.log("Patient inserted successfully:", newPatient);
        patientIdToUse = newPatient[0].id;
      }

      console.log('Patient ID to use:', patientIdToUse);

      const consultationData = {
        PatientId: patientIdToUse,
        DentistId: parseInt(formData.DentistId),
        Status: 'approved',
        AppointmentDate: formData.AppointmentDate, // Already in UTC ISO format
      };

      console.log('Saving consultation to Supabase:', consultationData);

      let consultationResult;
      if (selectedAppointment) {
        const { data, error: consultationError } = await supabase
          .from('Consultation')
          .update(consultationData)
          .eq('id', selectedAppointment.id)
          .select();

        if (consultationError) {
          console.error('Consultation update error:', consultationError);
          throw new Error(`Error updating consultation: ${consultationError.message}`);
        }
        consultationResult = data;
        console.log("Consultation updated successfully:", consultationResult);
      } else {
        const { data, error: consultationError } = await supabase
          .from('Consultation')
          .insert([consultationData])
          .select();

        if (consultationError) {
          console.error('Consultation insert error:', consultationError);
          throw new Error(`Error inserting consultation: ${consultationError.message}`);
        }
        consultationResult = data;
        console.log("Consultation inserted successfully:", consultationResult);
      }

      alert(selectedAppointment ? "Appointment rescheduled successfully!" : "Appointment scheduled successfully!");
      
      // Refresh appointments after saving
      const { data: allConsultations, error: allConsultationsError } = await supabase
        .from('Consultation')
        .select('*, Dentist(DentistName), Diagnosis(*)')
        .eq('PatientId', patientIdToUse)
        .order('AppointmentDate', { ascending: true });

      if (allConsultationsError) {
        console.error("Error refreshing consultations:", allConsultationsError);
      } else {
        const consultationsWithStatus = allConsultations.map((consultation, index, arr) => {
          const priorConsultations = arr.slice(0, index).filter(
            (c) => c.PatientId === consultation.PatientId
          );
          const patientStatus = priorConsultations.length === 0 ? "new" : "returning";
          return { ...consultation, patientStatus };
        });

        const activeAppointments = consultationsWithStatus.filter(
          (consultation) => consultation.Status !== 'complete'
        );
        const completedAppointments = consultationsWithStatus.filter(
          (consultation) => consultation.Status === 'complete'
        );

        setAppointments(activeAppointments);
        setCompletedConsultations(completedAppointments);
        setCurrentPageAppointments(1); // Reset to first page after data refresh

        const today = new Date();
        const sevenDaysFromNow = new Date(today);
        sevenDaysFromNow.setDate(today.getDate() + 7);
        const notifications = consultationsWithStatus
          .filter((consultation) => consultation.followupdate)
          .map((consultation) => {
            const followUpDate = new Date(consultation.followupdate);
            if (followUpDate >= today && followUpDate <= sevenDaysFromNow) {
              return {
                consultationId: consultation.id,
                followUpDate: followUpDate,
                dentistName: consultation.Dentist.DentistName,
                appointmentTime: formatDateTimePhilippine(consultation.AppointmentDate),
              };
            }
            return null;
          })
          .filter((notification) => notification !== null);

        setFollowUpNotifications(notifications);
      }

      // Refresh all dentist appointments to update unavailable slots
      const { data: allAppointmentsData, error: allAppointmentsError } = await supabase
        .from('Consultation')
        .select('DentistId, AppointmentDate, Status')
        .in('Status', ['approved', 'In Consultation']);

      if (allAppointmentsError) {
        console.error("Error refreshing all dentist appointments:", allAppointmentsError);
      } else {
        setAllDentistAppointments(allAppointmentsData || []);
        console.log('Refreshed All Dentist Appointments:', allAppointmentsData);
      }

    } catch (error) {
      console.error('Submission error:', error.message);
      alert(`An error occurred: ${error.message}`);
    } finally {
      closeModal();
    }
  };

  const handleCancel = async (appointmentId) => {
    if (window.confirm("Are you sure you want to cancel this appointment?")) {
      try {
        const { error } = await supabase
          .from('Consultation')
          .delete()
          .eq('id', appointmentId);

        if (error) {
          console.error('Cancel error:', error);
          throw new Error(`Error canceling appointment: ${error.message}`);
        }

        console.log("Appointment canceled successfully");
        const { data: allConsultations, error: allConsultationsError } = await supabase
          .from('Consultation')
          .select('*, Dentist(DentistName), Diagnosis(*)')
          .eq('PatientId', patientId)
          .order('AppointmentDate', { ascending: true });

        if (allConsultationsError) {
          console.error("Error refreshing consultations:", allConsultationsError);
        } else {
          const consultationsWithStatus = allConsultations.map((consultation, index, arr) => {
            const priorConsultations = arr.slice(0, index).filter(
              (c) => c.PatientId === consultation.PatientId
            );
            const patientStatus = priorConsultations.length === 0 ? "new" : "returning";
            return { ...consultation, patientStatus };
          });

          const activeAppointments = consultationsWithStatus.filter(
            (consultation) => consultation.Status !== 'complete'
          );
          setAppointments(activeAppointments);
          setCurrentPageAppointments(1); // Reset to first page after data refresh

          const today = new Date();
          const sevenDaysFromNow = new Date(today);
          sevenDaysFromNow.setDate(today.getDate() + 7);
          const notifications = consultationsWithStatus
            .filter((consultation) => consultation.followupdate)
            .map((consultation) => {
              const followUpDate = new Date(consultation.followupdate);
              if (followUpDate >= today && followUpDate <= sevenDaysFromNow) {
                return {
                  consultationId: consultation.id,
                  followUpDate: followUpDate,
                  dentistName: consultation.Dentist.DentistName,
                  appointmentTime: formatDateTimePhilippine(consultation.AppointmentDate),
                };
              }
              return null;
            })
            .filter((notification) => notification !== null);

          setFollowUpNotifications(notifications);
        }

        // Refresh all dentist appointments after cancellation
        const { data: allAppointmentsData, error: allAppointmentsError } = await supabase
          .from('Consultation')
          .select('DentistId, AppointmentDate, Status')
          .in('Status', ['approved', 'In Consultation']);

        if (allAppointmentsError) {
          console.error("Error refreshing all dentist appointments:", allAppointmentsError);
        } else {
          setAllDentistAppointments(allAppointmentsData || []);
          console.log('Refreshed All Dentist Appointments after cancellation:', allAppointmentsData);
        }
      } catch (error) {
        console.error('Cancel error:', error.message);
        alert(`An error occurred: ${error.message}`);
      }
    }
  };

  const handleViewRejectionReason = (reason) => {
    setReasonToView(reason || "No reason provided.");
    setViewReasonModalOpen(true);
  };

  const handleViewFollowUpReason = (reason, followUpDate) => {
    setFollowUpDetailsToView({
      reason: reason || "No reason provided.",
      date: followUpDate || null,
    });
    setViewFollowUpReasonModalOpen(true);
  };

  const handleImageError = () => {
    setImageError(true);
    console.error('Image failed to load:', currentDiagnosis?.ImageUrl);
  };

  const getFullImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${SUPABASE_STORAGE_URL}${url}`;
  };

  const filteredAppointments = statusFilter === "all"
    ? appointments
    : appointments.filter(
        (appointment) => appointment.Status.toLowerCase() === statusFilter.toLowerCase()
      );

  // Pagination for Upcoming Appointments
  const totalAppointments = filteredAppointments.length;
  const totalPagesAppointments = Math.ceil(totalAppointments / appointmentsPerPage);
  const startIndexAppointments = (currentPageAppointments - 1) * appointmentsPerPage;
  const endIndexAppointments = startIndexAppointments + appointmentsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndexAppointments, endIndexAppointments);

  const handlePageChangeAppointments = (page) => {
    if (page >= 1 && page <= totalPagesAppointments) {
      setCurrentPageAppointments(page);
    }
  };

  // Combine and sort Dental History
  const combinedHistory = [
    ...patientHistory.map(history => ({
      type: 'history',
      date: new Date(history.date),
      data: history,
    })),
    ...completedConsultations.map(consultation => ({
      type: 'consultation',
      date: "AppointmentDate" in consultation ? new Date(consultation.AppointmentDate) : new Date(consultation.created_at),
      data: consultation,
    })),
  ].sort((a, b) => b.date - a.date);

  // Pagination for Dental History
  const totalHistory = combinedHistory.length;
  const totalPagesHistory = Math.ceil(totalHistory / historyPerPage);
  const startIndexHistory = (currentPageHistory - 1) * historyPerPage;
  const endIndexHistory = startIndexHistory + historyPerPage;
  const currentHistory = combinedHistory.slice(startIndexHistory, endIndexHistory);

  const handlePageChangeHistory = (page) => {
    if (page >= 1 && page <= totalPagesHistory) {
      setCurrentPageHistory(page);
    }
  };

  // Reset pagination when status filter changes
  useEffect(() => {
    setCurrentPageAppointments(1);
  }, [statusFilter]);

  if (!patientId) {
    return <div>Loading patient data...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <img src={logo} alt="Logo" className={styles.logo} />
        </div>
        <button className={styles.logoutButton} onClick={handleSignOut}>Sign Out</button>
      </header>
      
      <div className={styles.content}>
        <section className={styles.section}>
          <h1 className={styles.patientDashboardTitle}>
            <span className={styles.wordPrimary}>Appointment</span>{" "}
            <span className={styles.wordAccent}>Dashboard</span>
          </h1>
          <hr className={styles.divider} />
          <h3 className={styles.PatientDashboardTitleSection}>
            <span className={styles.wordPrimary}>Upcoming</span>{" "}
            <span className={styles.wordAccent}>Appointments</span>
          </h3>
          {followUpNotifications.length > 0 && (
            <div style={{ backgroundColor: '#fffae6', padding: '15px', marginBottom: '20px', borderRadius: '8px', border: '1px solid #ffd700' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#d4a017' }}>Follow-Up Reminder</h3>
              {followUpNotifications.map((notification) => (
                <p key={notification.consultationId} style={{ margin: '5px 0' }}>
                  You have a follow-up appointment with {notification.dentistName} on{" "}
                  {notification.followUpDate.toLocaleDateString()} at{" "}
                  {notification.appointmentTime.split(", ")[1]}.
                </p>
              ))}
            </div>
          )}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="statusFilter" style={{ marginRight: '10px' }}>
              Filter by Status:
            </label>
            <select
              className={styles.filterPatientSelect}
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px' }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="partially complete">Partially Complete</option>
              <option value="rejected">Rejected</option>
              <option value="follow-up">Follow-Up</option>
            </select>
          </div>
          {filteredAppointments.length > 0 ? (
            <>
              <div className={styles.cardContainer}>
                {currentAppointments.map(appointment => {
                  const statusLower = appointment.Status.toLowerCase();
                  const canReschedule = !["partially complete", "follow-up", "rejected"].includes(statusLower);
                  const formattedDateTime = formatDateTimePhilippine(appointment.AppointmentDate);
                  console.log(`Upcoming Appointment ID ${appointment.id} - Raw AppointmentDate: ${appointment.AppointmentDate}, Displayed: ${formattedDateTime}`);

                  return (
                    <div key={appointment.id} className={styles.card}>
                      <p><strong>Date and Time:</strong> {formattedDateTime}</p>
                      <p><strong>Dentist:</strong> {appointment.Dentist.DentistName}</p>
                      <p><strong>Patient Status:</strong> {appointment.patientStatus === "new" ? "New" : "Returning"}</p>
                      <p><strong>Status:</strong> {appointment.Status}</p>
                      <div>
                        {canReschedule && (
                          <>
                            <div className={styles.buttonPatientRow}>
                              <button 
                                className={styles.actionButton} 
                                onClick={() => openModal(appointment)}
                              >
                                Reschedule
                              </button>
                              <button 
                                className={styles.actionButton} 
                                onClick={() => handleCancel(appointment.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        )}
                        {appointment.Status === "rejected" && (
                          <button
                            className={styles.actionButton}
                            onClick={() => handleViewRejectionReason(appointment.rejection_reason)}
                          >
                            View Reason
                          </button>
                        )}
                        {appointment.Status === "follow-up" && (
                          <button
                            className={styles.actionButton}
                            onClick={() => handleViewFollowUpReason(appointment.FollowUpReason, appointment.followupdate)}
                          >
                            View Follow-Up Reason
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.paginationContainer}>
                <button
                  onClick={() => handlePageChangeAppointments(currentPageAppointments - 1)}
                  disabled={currentPageAppointments === 1}
                  className={styles.paginationButton}
                >
                  Previous
                </button>
                {Array.from({ length: totalPagesAppointments }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChangeAppointments(page)}
                    className={`${styles.paginationButton} ${
                      currentPageAppointments === page ? styles.paginationButtonActive : ""
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChangeAppointments(currentPageAppointments + 1)}
                  disabled={currentPageAppointments === totalPagesAppointments}
                  className={styles.paginationButton}
                >
                  Next
                </button>
              </div>
              <div className={styles.paginationInfo}>
                Showing {startIndexAppointments + 1} to {Math.min(endIndexAppointments, totalAppointments)} of {totalAppointments} appointments
              </div>
            </>
          ) : (
            <p className={styles.noData}>No upcoming appointments match the selected status.</p>
          )}
          <button className={styles.buttonSched} onClick={() => openModal()}>Schedule New Appointment</button>
        </section>
        <hr className={styles.dividerMiddle} />
        <section className={styles.section}>
          <h3 className={styles.PatientDashboardTitleSection}>
            <span className={styles.wordPrimary}>Dental</span>{" "}
            <span className={styles.wordAccent}>History</span>
          </h3>
          {(patientHistory.length > 0 || completedConsultations.length > 0) ? (
            <>
              <div className={styles.cardContainer}>
                {currentHistory.map((entry, index) => {
                  const formattedDateTime = entry.type === 'consultation' ? formatDateTimePhilippine(entry.data.AppointmentDate) : null;
                  if (entry.type === 'consultation') {
                    console.log(`Dental History Consultation ID ${entry.data.id} - Raw AppointmentDate: ${entry.data.AppointmentDate}, Displayed: ${formattedDateTime}`);
                  }

                  return (
                    <div key={`${entry.type}-${entry.data.id}`} className={styles.card}>
                      {entry.type === 'history' ? (
                        <>
                          <p><strong>Date:</strong> {entry.data.date}</p>
                          <p><strong>Note:</strong> {entry.data.note}</p>
                        </>
                      ) : (
                        <>
                          <p><strong>Date and Time:</strong> {formattedDateTime}</p>
                          <p><strong>Dentist:</strong> {entry.data.Dentist.DentistName}</p>
                          <p><strong>Patient Status:</strong> {entry.data.patientStatus === "new" ? "New" : "Returning"}</p>
                          <p><strong>Status:</strong> Completed</p>
                          <button
                            className={styles.actionButton}
                            onClick={() => openDiagnosisModal(entry.data.Diagnosis)}
                          >
                            View Diagnosis
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className={styles.paginationContainer}>
                <button
                  onClick={() => handlePageChangeHistory(currentPageHistory - 1)}
                  disabled={currentPageHistory === 1}
                  className={styles.paginationButton}
                >
                  Previous
                </button>
                {Array.from({ length: totalPagesHistory }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChangeHistory(page)}
                    className={`${styles.paginationButton} ${
                      currentPageHistory === page ? styles.paginationButtonActive : ""
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChangeHistory(currentPageHistory + 1)}
                  disabled={currentPageHistory === totalPagesHistory}
                  className={styles.paginationButton}
                >
                  Next
                </button>
              </div>
              <div className={styles.paginationInfo}>
                Showing {startIndexHistory + 1} to {Math.min(endIndexHistory, totalHistory)} of {totalHistory} history entries
              </div>
            </>
          ) : (
            <p className={styles.noData}>No dental history available yet.</p>
          )}
        </section>
      </div>

      <AppointmentModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        dentists={dentists} 
        handleSubmit={handleSubmit}
        userEmail={email}
        patientData={patientData}
        appointment={selectedAppointment}
        styles={styles}
        dentistAvailability={dentistAvailability}
        allAppointments={allDentistAppointments} // Pass all dentist appointments
      />

      {isDiagnosisModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <h3 className={styles.PatientDashboardTitleSection} style={{ textAlign: "center" }}>
              <p className={styles.preTitleModal}>Patient Overview</p>
              <hr className={styles.dividerModal} />
              <span className={styles.wordPrimary}>Diagnosis</span>{" "}
              <span className={styles.wordAccent}>History</span>
            </h3>
            {selectedDiagnoses && selectedDiagnoses.length > 0 ? (
              <>
                <div style={{ marginBottom: "20px" }}>
                  <label>
                    <strong>Select Diagnosis Record:</strong>
                    <select
                      value={currentDiagnosis?.id || ""}
                      onChange={(e) => {
                        const selected = selectedDiagnoses.find(d => d.id === parseInt(e.target.value));
                        handleSelectDiagnosis(selected);
                      }}
                      style={{ marginLeft: "10px", padding: "5px", width: "100%", maxWidth: "400px" }}
                    >
                      {selectedDiagnoses.map((diagnosis) => (
                        <option key={diagnosis.id} value={diagnosis.id}>
                          {`Diagnosis #${diagnosis.id} - ${diagnosis.InitialDiagnosis || "No Initial Diagnosis"}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {currentDiagnosis && (
                  <>
                    <p><strong>Diagnosis ID:</strong> {currentDiagnosis.id}</p>
                    <p><strong>Initial Diagnosis:</strong> {currentDiagnosis.InitialDiagnosis || "Not provided"}</p>
                    <p><strong>Image:</strong></p>
                    {imageError ? (
                      <p style={{ color: 'red' }}>
                        Unable to load image. URL: {getFullImageUrl(currentDiagnosis.ImageUrl)}
                      </p>
                    ) : (
                      <img
                        src={getFullImageUrl(currentDiagnosis.ImageUrl)}
                        alt="Diagnosis"
                        style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
                        onError={handleImageError}
                        onLoad={() => console.log('Image loaded successfully')}
                      />
                    )}
                    <p><strong>Confidence:</strong> {(currentDiagnosis.Confidence * 100).toFixed(2)}%</p>
                    <p><strong>Final Diagnosis:</strong> {currentDiagnosis.FinalDiagnosis || 'Not provided'}</p>
                    <p><strong>Final Diagnosis Description:</strong> {currentDiagnosis.FinalDiagnosisDesc || 'Not provided'}</p>
                  </>
                )}
                <div className={styles.modalButtons}>
                  <button
                    className={styles.actionButton}
                    onClick={closeDiagnosisModal}
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

      {viewReasonModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Rejection Reason</h3>
            <div className={styles.modalcont}>
              <p>{reasonToView}</p>
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

      {viewFollowUpReasonModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Follow-Up Details</h3>
            <div className={styles.modalcont}>
              <p><strong>Follow-Up Date:</strong> {followUpDetailsToView.date ? formatDateTimePhilippine(followUpDetailsToView.date) : "Not set"}</p>
              <p><strong>Reason:</strong> {followUpDetailsToView.reason}</p>
            </div>
            <div className={styles.modalButtons}>
              <button
                className={styles.actionButton}
                onClick={() => {
                  setViewFollowUpReasonModalOpen(false);
                  setFollowUpDetailsToView({ reason: "", date: "" });
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
