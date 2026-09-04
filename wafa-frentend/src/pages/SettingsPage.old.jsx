import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  FaBell,
  FaLock,
  FaUser,
  FaShieldAlt,
  FaDownload,
  FaSave,
  FaTimes,
  FaCamera,
  FaKey,
  FaGraduationCap,
} from "react-icons/fa";

const SettingsPage = () => {
  const [profile, setProfile] = useState({
    // Personal Information
    firstName: "Az-eddine",
    lastName: "Serhani",
    email: "azeddine.serhani@email.com",
    phone: "+212 6 12 34 56 78",
    dateOfBirth: "1995-03-15",
    address: "Casablanca, Maroc",
    profilePicture: null,

    // Academic Information
    university: "",
    faculty: "Faculté de Médecine",
    currentYear: "6ème année",
    studentId: "MED2024001",
    specialization: "Médecine Générale",

    // Account Settings
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",

    // Privacy & Notifications
    emailNotifications: true,
    profileVisibility: "public",
    shareProgress: true,
    twoFactorAuth: false,
  });

  const [activeTab, setActiveTab] = useState("personal");

  const handleProfileChange = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const profileTabs = [
    { id: "personal", label: "Personnelles", icon: FaUser },
    { id: "academic", label: "Académiques", icon: FaGraduationCap },
    { id: "security", label: "Sécurité", icon: FaLock },
  ];

  const InputField = ({
    value,
    onChange,
    label,
    type = "text",
    placeholder,
    required = false,
  }) => (
    <div className="py-3">
      <label className="block text-gray-900 font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-white border border-blue-200 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
        required={required}
      />
    </div>
  );

  const SelectInput = ({
    value,
    onChange,
    options,
    label,
    description,
    required,
  }) => (
    <div className="py-3">
      <h4 className="text-gray-900 font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </h4>
      {description && (
        <p className="text-gray-600 text-sm mb-3">{description}</p>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all shadow-sm"
        required={required}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderPersonalInfo = () => (
    <div className="space-y-4">
      {/* Profile Picture */}
      <div className="flex items-center space-x-6 py-4">
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {profile.firstName?.[0]}
            {profile.lastName?.[0]}
          </div>
          <button className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors shadow-lg">
            <FaCamera size={12} />
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Photo de Profil
          </h3>
          <p className="text-gray-600 text-sm">
            Cliquez sur l'icône pour changer votre photo
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          value={profile.firstName}
          onChange={(value) => handleProfileChange("firstName", value)}
          label="Prénom"
          required
        />
        <InputField
          value={profile.lastName}
          onChange={(value) => handleProfileChange("lastName", value)}
          label="Nom"
          required
        />
      </div>

      <InputField
        value={profile.email}
        onChange={(value) => handleProfileChange("email", value)}
        label="Email"
        type="email"
        required
      />

      <InputField
        value={profile.phone}
        onChange={(value) => handleProfileChange("phone", value)}
        label="Téléphone"
        type="tel"
      />

      <InputField
        value={profile.dateOfBirth}
        onChange={(value) => handleProfileChange("dateOfBirth", value)}
        label="Date de Naissance"
        type="date"
      />

      <InputField
        value={profile.address}
        onChange={(value) => handleProfileChange("address", value)}
        label="Adresse"
      />
    </div>
  );

  const renderAcademicInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <InputField
        value={profile.university}
        onChange={(value) => handleProfileChange("university", value)}
        label="Université"
      />

      <InputField
        value={profile.faculty}
        onChange={(value) => handleProfileChange("faculty", value)}
        label="Faculté"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectInput
          required={true}
          value={profile.currentYear}
          onChange={(value) => handleProfileChange("currentYear", value)}
          label="Année d'Études"
          options={[
            { value: "1ère année", label: "1ère année" },
            { value: "2ème année", label: "2ème année" },
            { value: "3ème année", label: "3ème année" },
            { value: "4ème année", label: "4ème année" },
            { value: "5ème année", label: "5ème année" },
            { value: "6ème année", label: "6ème année" },
            { value: "7ème année", label: "7ème année" },
          ]}
        />
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <FaKey className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Changer le Mot de Passe
          </h3>
        </div>
        <p className="text-gray-600 text-sm mt-2">
          Pour votre sécurité, utilisez un mot de passe fort contenant au moins
          8 caractères.
        </p>
      </div>

      <InputField
        value={profile.currentPassword}
        onChange={(value) => handleProfileChange("currentPassword", value)}
        label="Mot de Passe Actuel"
        type="password"
        required={true}
      />

      <InputField
        value={profile.newPassword}
        onChange={(value) => handleProfileChange("newPassword", value)}
        label="Nouveau Mot de Passe"
        type="password"
        required
      />

      <InputField
        value={profile.confirmPassword}
        onChange={(value) => handleProfileChange("confirmPassword", value)}
        label="Confirmer le Nouveau Mot de Passe"
        type="password"
        required
      />
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "personal":
        return renderPersonalInfo();
      case "academic":
        return renderAcademicInfo();
      case "security":
        return renderSecuritySettings();

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-100 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-teal-100 rounded-full opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-blue-200 rounded-full opacity-25 animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-blue-100 px-8 py-6"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Profil</h1>
          <p className="text-gray-700">
            Gérez vos informations personnelles et académiques
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Profile Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 flex-1"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-blue-100 shadow-lg ">
              <nav className="space-y-2">
                {profileTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-blue-500/20 to-teal-500/20 text-blue-700 border border-blue-300 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-blue-50"
                    }`}
                  >
                    <tab.icon className="text-lg" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </motion.div>

          {/* Profile Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 flex-1"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-blue-100 shadow-lg">
              <div className="flex items-center space-x-3 mb-6">
                {profileTabs.find((tab) => tab.id === activeTab)?.icon &&
                  React.createElement(
                    profileTabs.find((tab) => tab.id === activeTab).icon,
                    {
                      className: "text-xl text-blue-600",
                    }
                  )}
                <h2 className="text-xl font-semibold text-gray-900">
                  {profileTabs.find((tab) => tab.id === activeTab)?.label}
                </h2>
              </div>

              <div className="">{renderTabContent()}</div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-blue-100">
                <div className="flex space-x-4">
                  <button className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg text-white hover:from-blue-600 hover:to-teal-600 transition-all duration-300 shadow-lg">
                    <FaSave />
                    <span>Sauvegarder</span>
                  </button>
                  <button className="flex items-center space-x-2 px-6 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition-all duration-300">
                    <FaTimes />
                    <span>Annuler</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
