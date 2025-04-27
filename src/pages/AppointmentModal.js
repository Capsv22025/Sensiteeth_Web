import React, { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import styles from "./PatientDashboard.module.css";
import { supabase } from "../supabaseClient";

const AppointmentModal = ({
  isOpen,
  onClose,
  dentists,
  handleSubmit,
  userEmail,
  patientData,
  appointment,
  dentistAvailability,
  allAppointments,
}) => {
  const initialFormData = {
    FirstName: patientData?.FirstName || "",
    MiddleName: patientData?.MiddleName || "",
    LastName: patientData?.LastName || "",
    Age: patientData?.Age || "",
    BirthDate: patientData?.BirthDate || "",
    Email: userEmail || "",
    Address: patientData?.Address || "",
    Gender: patientData?.Gender || "",
    ContactNo: patientData?.ContactNo || "",
    DentistId: "",
    AppointmentDate: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [dateError, setDateError] = useState(null);
  const [timeSlotError, setTimeSlotError] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [unavailableDates, setUnavailableDates] = useState(new Set());
  const calendarRef = useRef(null);

  const TIME_SLOTS = [
    { start: 8, end: 9, label: "8:00 AM - 9:00 AM" },
    { start: 9, end: 10, label: "9:00 AM - 10:00 AM" },
    { start: 10, end: 11, label: "10:00 AM - 11:00 AM" },
    { start: 11, end: 12, label: "11:00 AM - 12:00 PM" },
    { start: 12, end: 13, label: "12:00 PM - 1:00 PM" },
    { start: 13, end: 14, label: "1:00 PM - 2:00 PM" },
    { start: 14, end: 15, label: "2:00 PM - 3:00 PM" },
    { start: 15, end: 16, label: "3:00 PM - 4:00 PM" },
    { start: 16, end: 17, label: "4:00 PM - 5:00 PM" },
  ];

  useEffect(() => {
    if (isOpen) {
      console.log("Dentist Availability Data on Open:", dentistAvailability);
      if (appointment) {
        const appointmentDate = new Date(appointment.AppointmentDate);
        const philippineDate = new Date(appointmentDate.getTime() + 8 * 60 * 60 * 1000);
        const year = philippineDate.getFullYear();
        const month = philippineDate.getMonth();
        const day = philippineDate.getDate();
        const philippineMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
        const normalizedDate = new Date(philippineMidnight.getTime() - 8 * 60 * 60 * 1000);

        const philippineHours = philippineDate.getHours();
        const selectedSlot = TIME_SLOTS.find(
          (slot) => slot.start <= philippineHours && philippineHours < slot.end
        );

        setFormData({
          FirstName: patientData?.FirstName || "",
          MiddleName: patientData?.MiddleName || "",
          LastName: patientData?.LastName || "",
          Age: patientData?.Age || "",
          BirthDate: patientData?.BirthDate || "",
          Email: userEmail || "",
          Address: patientData?.Address || "",
          Gender: patientData?.Gender || "",
          ContactNo: patientData?.ContactNo || "",
          DentistId: appointment.DentistId || "",
          AppointmentDate: appointment.AppointmentDate || "",
        });
        setSelectedDate(normalizedDate);
        setSelectedTimeSlot(selectedSlot || null);
      } else {
        setFormData({ ...initialFormData, Email: userEmail || "" });
        setSelectedDate(null);
        setSelectedTimeSlot(null);
      }
    }
  }, [isOpen, userEmail, patientData, appointment, dentistAvailability]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    console.log("useEffect triggered with selectedDate:", selectedDate, "DentistId:", formData.DentistId);
    if (selectedDate && formData.DentistId) {
      updateTimeSlots(selectedDate, formData.DentistId);
    } else {
      setTimeSlots([]);
      setSelectedTimeSlot(null);
    }
  }, [selectedDate, formData.DentistId, allAppointments]);

  const formatDateToPhilippines = (date) => {
    const philippineDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    const year = philippineDate.getUTCFullYear();
    const month = String(philippineDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(philippineDate.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const updateTimeSlots = (date, dentistId) => {
    const formattedDate = formatDateToPhilippines(date);
    console.log("Formatted Date in updateTimeSlots:", formattedDate);

    const dateAppointments = allAppointments.filter((appt) => {
      const apptDate = new Date(appt.AppointmentDate);
      const apptFormattedDate = formatDateToPhilippines(apptDate);
      return (
        appt.DentistId === parseInt(dentistId) &&
        appt.Status.toLowerCase() === "approved" &&
        apptFormattedDate === formattedDate
      );
    });
    console.log("Filtered Appointments for Date:", dateAppointments);

    const availabilityEntry = dentistAvailability.find(
      (entry) =>
        entry.DentistId === parseInt(dentistId) && entry.Date === formattedDate
    );
    console.log("Availability Entry:", availabilityEntry);

    const currentDateTime = new Date();
    const currentPhilippineTime = new Date(currentDateTime.getTime() + 8 * 60 * 60 * 1000);

    const updatedSlots = TIME_SLOTS.map((slot) => {
      const philippineDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
      const year = philippineDate.getFullYear();
      const month = philippineDate.getMonth();
      const day = philippineDate.getDate();
      const baseDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

      const slotStart = new Date(baseDate);
      const [startTime] = slot.label.split(" - ");
      const [hourStr, period] = startTime.split(" ");
      let hour = parseInt(hourStr.split(":")[0], 10);
      if (period === "PM" && hour !== 12) {
        hour += 12;
      } else if (period === "AM" && hour === 12) {
        hour = 0;
      }
      const utcStartHour = (hour + 24 - 8) % 24;
      slotStart.setUTCHours(utcStartHour, 0, 0, 0);

      const slotEnd = new Date(baseDate);
      const [endTime] = slot.label.split(" - ")[1].split(" ");
      let endHour = parseInt(endTime.split(":")[0], 10);
      const endPeriod = slot.label.split(" - ")[1].includes("PM") ? "PM" : "AM";
      if (endPeriod === "PM" && endHour !== 12) {
        endHour += 12;
      } else if (endPeriod === "AM" && endHour === 12) {
        endHour = 0;
      }
      const utcEndHour = (endHour + 24 - 8) % 24;
      slotEnd.setUTCHours(utcEndHour, 0, 0, 0);

      const hasApprovedAppointment = dateAppointments.some((appt) => {
        const apptDateTime = new Date(appt.AppointmentDate);
        return apptDateTime >= slotStart && apptDateTime < slotEnd;
      });

      const isPast =
        slotEnd < currentPhilippineTime &&
        slotEnd.toDateString() === currentPhilippineTime.toDateString();

      const isAvailable =
        availabilityEntry && availabilityEntry.IsAvailable && !hasApprovedAppointment && !isPast;

      return { ...slot, isAvailable };
    });

    console.log("Updated Time Slots:", updatedSlots);
    setTimeSlots(updatedSlots);

    const allSlotsUnavailable = updatedSlots.every(slot => !slot.isAvailable);
    setUnavailableDates(prev => {
      const newSet = new Set(prev);
      if (allSlotsUnavailable) {
        newSet.add(formattedDate);
      } else {
        newSet.delete(formattedDate);
      }
      return newSet;
    });

    if (selectedTimeSlot) {
      const currentSlot = updatedSlots.find(
        (slot) => slot.label === selectedTimeSlot.label
      );
      if (!currentSlot || !currentSlot.isAvailable) {
        setSelectedTimeSlot(null);
        setTimeSlotError(null);
        setFormData((prev) => ({
          ...prev,
          AppointmentDate: date.toISOString(),
        }));
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name !== "Email") {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
      console.log("Form Data Updated:", { ...formData, [name]: value });

      if (name === "DentistId" && selectedDate) {
        console.log("Triggering updateTimeSlots with DentistId:", value, "and Date:", selectedDate);
        updateTimeSlots(selectedDate, value);
      }
    }
  };

  const handleDateInputClick = () => {
    setShowCalendar(true);
  };

  const handleDateSelect = (date) => {
    const formattedDate = formatDateToPhilippines(date);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (date < currentDate) {
      setDateError("Appointment date cannot be earlier than today.");
      setShowCalendar(false);
      return;
    }

    const dentistId = parseInt(formData.DentistId);
    if (!dentistId) {
      setDateError("Please select a dentist first.");
      setShowCalendar(false);
      return;
    }

    const entry = dentistAvailability.find(
      (entry) => entry.DentistId === dentistId && entry.Date === formattedDate
    );

    if (!entry || !entry.IsAvailable) {
      setDateError("This date is not available for the selected dentist.");
      setShowCalendar(false);
      return;
    }

    const philippineDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const year = philippineDate.getFullYear();
    const month = philippineDate.getMonth();
    const day = philippineDate.getDate();
    const philippineMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const normalizedDate = new Date(philippineMidnight.getTime() - 8 * 60 * 60 * 1000);

    setDateError(null);
    setSelectedDate(normalizedDate);
    setSelectedTimeSlot(null);
    setTimeSlotError(null);
    setFormData((prevState) => ({
      ...prevState,
      AppointmentDate: normalizedDate.toISOString(),
    }));
    setShowCalendar(false);
    console.log("Selected Date (Formatted):", formattedDate, "SelectedDate State (UTC):", normalizedDate.toISOString());
  };

  const handleTimeSlotSelect = (slot) => {
    if (!slot.isAvailable) {
      alert("This time slot is not available.");
      return;
    }

    setSelectedTimeSlot(slot);
    setTimeSlotError(null);

    const dateWithTime = new Date(selectedDate);

    const [startTime] = slot.label.split(" - ");
    const [hourStr, period] = startTime.split(" ");
    let hour = parseInt(hourStr.split(":")[0], 10);

    if (period === "PM" && hour !== 12) {
      hour += 12;
    } else if (period === "AM" && hour === 12) {
      hour = 0;
    }

    const philippineDate = new Date(dateWithTime.getTime() + 8 * 60 * 60 * 1000);
    const year = philippineDate.getFullYear();
    const month = philippineDate.getMonth();
    const day = philippineDate.getDate();
    const baseDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

    const utcHour = (hour + 24 - 8) % 24;
    baseDate.setUTCHours(utcHour, 0, 0, 0);

    setFormData((prev) => ({
      ...prev,
      AppointmentDate: baseDate.toISOString(),
    }));
    console.log("Selected Time Slot:", slot.label);
    console.log("Adjusted Hour (Philippine Time):", hour);
    console.log("UTC Hour:", utcHour);
    console.log("Base Date (UTC):", baseDate.toISOString());
    console.log("Updated AppointmentDate (UTC):", baseDate.toISOString());
  };

  const clearForm = () => {
    setFormData({ ...initialFormData, Email: userEmail || "" });
    setDateError(null);
    setTimeSlotError(null);
    setShowCalendar(false);
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    setTimeSlots([]);
    setUnavailableDates(new Set());
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (dateError || !formData.DentistId || !formData.AppointmentDate) {
      alert(dateError || "Please select a dentist and a valid appointment date.");
      return;
    }

    if (!selectedTimeSlot) {
      setTimeSlotError("Please select a time slot.");
      alert("Please select a time slot.");
      return;
    }

    const appointmentDateTime = new Date(formData.AppointmentDate);
    const currentDateTime = new Date();
    const currentPhilippineTime = new Date(currentDateTime.getTime() + 8 * 60 * 60 * 1000);
    if (appointmentDateTime < currentPhilippineTime) {
      alert("Cannot schedule an appointment in the past.");
      return;
    }

    const hasConflict = allAppointments.some((appt) => {
      const apptDateTime = new Date(appt.AppointmentDate);
      return (
        appt.DentistId === parseInt(formData.DentistId) &&
        appt.Status.toLowerCase() === "approved" &&
        apptDateTime.getTime() === appointmentDateTime.getTime()
      );
    });

    if (hasConflict) {
      alert("This time slot is already taken by an approved appointment.");
      return;
    }

    console.log("Submitting Form Data:", formData);
    await handleSubmit(formData);
    clearForm();
  };

  const tileClassName = ({ date }) => {
    const formattedDate = formatDateToPhilippines(date);
    const dentistId = parseInt(formData.DentistId);
    if (!dentistId) return null;

    const entry = dentistAvailability.find(
      (entry) => entry.DentistId === dentistId && entry.Date === formattedDate
    );

    if (unavailableDates.has(formattedDate)) {
      return styles.unavailableAllSlots;
    }

    return entry && entry.IsAvailable ? styles.available : (entry ? styles.unavailable : null);
  };

  const tileDisabled = ({ date }) => {
    const formattedDate = formatDateToPhilippines(date);
    const dentistId = parseInt(formData.DentistId);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (!dentistId || date < currentDate) {
      console.log(`Tile ${formattedDate} disabled: No DentistId or past date`);
      return true;
    }

    const entry = dentistAvailability.find(
      (entry) => entry.DentistId === dentistId && entry.Date === formattedDate
    );

    const disabled = !entry || !entry.IsAvailable;
    console.log(`Tile ${formattedDate} disabled:`, { dentistId, entry, disabled });
    return disabled;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {appointment ? (
          <h3 className={styles.PatientDashboardTitleSectionModal}>
            <p className={styles.preTitleModal}>Update Booking</p>
            <hr className={styles.dividerModal} />
            <span className={styles.wordPrimary}>Reschedule</span>{" "}
            <span className={styles.wordAccent}>Appointment</span>
          </h3>
        ) : (
          <h3 className={styles.PatientDashboardTitleSectionModal}>
            <p className={styles.preTitleModal}>New Consultation</p>
            <hr className={styles.dividerModal} />
            <span className={styles.wordPrimary}>Schedule</span>{" "}
            <span className={styles.wordAccent}>Appointment</span>
          </h3>
        )}
        <form onSubmit={submitForm}>
          <div className={styles.formGrid}>
            <div>
              <label htmlFor="FirstName">First Name:</label>
              <input
                type="text"
                name="FirstName"
                id="FirstName"
                value={formData.FirstName}
                onChange={handleChange}
                className={styles.inputField}
                required
              />
            </div>
            <div>
              <label htmlFor="MiddleName">Middle Name:</label>
              <input
                type="text"
                name="MiddleName"
                id="MiddleName"
                value={formData.MiddleName}
                onChange={handleChange}
                className={styles.inputField}
              />
            </div>
            <div>
              <label htmlFor="LastName">Last Name:</label>
              <input
                type="text"
                name="LastName"
                id="LastName"
                value={formData.LastName}
                onChange={handleChange}
                className={styles.inputField}
                required
              />
            </div>
            <div>
              <label htmlFor="Age">Age:</label>
              <input
                type="number"
                name="Age"
                id="Age"
                value={formData.Age}
                onChange={handleChange}
                className={styles.inputField}
                required
              />
            </div>
            <div>
              <label htmlFor="BirthDate">Birth Date:</label>
              <input
                type="date"
                name="BirthDate"
                id="BirthDate"
                value={formData.BirthDate}
                onChange={handleChange}
                className={styles.inputField}
                required
              />
            </div>
            <div>
              <label htmlFor="Email">Email:</label>
              <input
                type="email"
                name="Email"
                id="Email"
                value={formData.Email}
                onChange={handleChange}
                className={styles.inputField}
                disabled
                required
              />
            </div>
            <div className={styles.fullWidth}>
              <label htmlFor="Address">Address:</label>
              <input
                type="text"
                name="Address"
                id="Address"
                value={formData.Address}
                onChange={handleChange}
                className={styles.inputField}
                required
              />
            </div>
            <div>
              <label htmlFor="Gender">Gender:</label>
              <select
                name="Gender"
                id="Gender"
                value={formData.Gender}
                onChange={handleChange}
                className={styles.inputField}
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="ContactNo">Contact No:</label>
              <input
                type="tel"
                name="ContactNo"
                id="ContactNo"
                value={formData.ContactNo}
                onChange={handleChange}
                className={styles.inputField}
                required
              />
            </div>
            <div>
              <label htmlFor="dentist">Choose Dentist:</label>
              <select
                name="DentistId"
                id="dentist"
                value={formData.DentistId}
                onChange={handleChange}
                className={styles.inputField}
                required
              >
                <option value="">Select Dentist</option>
                {dentists.map((dentist) => (
                  <option key={dentist.id} value={dentist.id}>
                    {dentist.DentistName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="AppointmentDate">Appointment Date:</label>
              <input
                type="text"
                name="AppointmentDate"
                id="AppointmentDate"
                value={
                  formData.AppointmentDate
                    ? (() => {
                        console.log("FormData.AppointmentDate (UTC):", formData.AppointmentDate);
                        const displayDate = new Date(formData.AppointmentDate);
                        const philippineDisplay = displayDate.toLocaleString("en-PH", {
                          timeZone: "Asia/Manila",
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "numeric",
                          hour12: true,
                        });
                        console.log("Displayed in Philippine Time:", philippineDisplay);
                        return philippineDisplay;
                      })()
                    : ""
                }
                onClick={handleDateInputClick}
                onChange={() => {}}
                className={styles.inputField}
                placeholder="Click to select a date and time"
                readOnly
                required
              />
              {showCalendar && (
                <div ref={calendarRef} className={styles.calendarContainer}>
                  <Calendar
                    onChange={handleDateSelect}
                    value={
                      selectedDate
                        ? new Date(selectedDate)
                        : formData.AppointmentDate
                        ? new Date(formData.AppointmentDate)
                        : null
                    }
                    tileClassName={tileClassName}
                    tileDisabled={tileDisabled}
                    minDate={new Date()}
                    className={styles.calendar}
                  />
                </div>
              )}
              {dateError && <p className={styles.error}>{dateError}</p>}
            </div>
            {selectedDate && formData.DentistId && (
              <div className={styles.fullWidth}>
                <label>Available Time Slots:</label>
                <div className={styles.timeSlots}>
                  {timeSlots.length > 0 ? (
                    timeSlots.map((slot, index) => (
                      <button
                        key={index}
                        type="button"
                        className={`${styles.timeSlot} ${
                          slot.isAvailable
                            ? styles.timeSlotAvailable
                            : styles.timeSlotUnavailable
                        } ${
                          selectedTimeSlot?.label === slot.label
                            ? styles.timeSlotSelected
                            : ""
                        }`}
                        onClick={() => handleTimeSlotSelect(slot)}
                        disabled={!slot.isAvailable}
                      >
                        {slot.label}
                      </button>
                    ))
                  ) : (
                    <p>No available time slots for this date.</p>
                  )}
                </div>
                {timeSlotError && <p className={styles.error}>{timeSlotError}</p>}
              </div>
            )}
          </div>
          <div className={styles.buttonContainer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.actionButton}
            >
              Close
            </button>
            <button
              type="submit"
              className={styles.actionButton}
              disabled={!!dateError || !selectedTimeSlot}
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentModal;