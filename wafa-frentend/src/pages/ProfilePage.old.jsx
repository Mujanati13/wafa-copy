import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaUser,
  FaEdit,
  FaCamera,
  FaEnvelope,
  FaPhone,
  FaGraduationCap,
  FaMapMarkerAlt,
  FaBirthdayCake,
  FaTrophy,
  FaMedal,
  FaStar,
  FaCalendarAlt,
  FaBook,
  FaSave,
  FaTimes,
  FaCheck
} from 'react-icons/fa';

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: 'Ahmed',
    lastName: 'Benali',
    email: 'ahmed.benali@example.com',
    phone: '+213 555 123 456',
    birthDate: '1998-03-15',
    university: '',
    faculty: 'Faculté de Médecine',
    year: '3ème Année',
    specialization: 'Médecine Générale',
    location: 'Alger, Algérie',
    bio: 'Étudiant passionné en médecine avec un intérêt particulier pour la cardiologie et la recherche médicale.'
  });

  const [editData, setEditData] = useState({ ...profileData });

  const achievements = [
    { icon: FaTrophy, title: 'Top Performer', description: 'Classé 1er du semestre', color: 'from-yellow-400 to-orange-500' },
    { icon: FaMedal, title: 'Expert Anatomie', description: '95% de réussite', color: 'from-blue-400 to-purple-500' },
    { icon: FaStar, title: 'Séquence Parfaite', description: '20 examens consécutifs', color: 'from-green-400 to-blue-500' },
    { icon: FaBook, title: 'Studieux', description: '200h d\'étude ce mois', color: 'from-purple-400 to-pink-500' }
  ];

  const stats = [
    { label: 'Examens Passés', value: '145', icon: FaBook },
    { label: 'Moyenne Générale', value: '16.8/20', icon: FaStar },
    { label: 'Heures d\'Étude', value: '1,240h', icon: FaCalendarAlt },
    { label: 'Classement', value: '3/156', icon: FaTrophy }
  ];

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...profileData });
  };

  const handleSave = () => {
    setProfileData({ ...editData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Profil Utilisateur</h1>
        <p className="text-gray-400">Gérez vos informations personnelles et suivez vos accomplissements</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Informations Personnelles</h2>
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
              >
                <FaEdit className="text-sm" />
                <span>Modifier</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg text-white hover:from-green-600 hover:to-blue-600 transition-all duration-300"
                >
                  <FaSave className="text-sm" />
                  <span>Sauvegarder</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 rounded-lg text-white hover:bg-gray-700 transition-all duration-300"
                >
                  <FaTimes className="text-sm" />
                  <span>Annuler</span>
                </button>
              </div>
            )}
          </div>

          {/* Avatar Section */}
          <div className="flex items-center space-x-6 mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <FaUser className="text-3xl text-white" />
              </div>
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-600 hover:bg-gray-600 transition-colors">
                <FaCamera className="text-white text-sm" />
              </button>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">
                {profileData.firstName} {profileData.lastName}
              </h3>
              <p className="text-gray-400">{profileData.year} - {profileData.specialization}</p>
              <p className="text-gray-500 text-sm">{profileData.university}</p>
            </div>
          </div>

          {/* Personal Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: FaEnvelope, label: 'Email', field: 'email', type: 'email' },
              { icon: FaPhone, label: 'Téléphone', field: 'phone', type: 'tel' },
              { icon: FaBirthdayCake, label: 'Date de Naissance', field: 'birthDate', type: 'date' },
              { icon: FaMapMarkerAlt, label: 'Localisation', field: 'location', type: 'text' },
              { icon: FaGraduationCap, label: 'Université', field: 'university', type: 'text' },
              { icon: FaBook, label: 'Faculté', field: 'faculty', type: 'text' }
            ].map((item, index) => (
              <div key={item.field} className="space-y-2">
                <label className="flex items-center space-x-2 text-gray-300 font-medium">
                  <item.icon className="text-gray-400" />
                  <span>{item.label}</span>
                </label>
                {isEditing ? (
                  <input
                    type={item.type}
                    value={editData[item.field]}
                    onChange={(e) => handleInputChange(item.field, e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors"
                  />
                ) : (
                  <p className="text-white bg-gray-800/50 px-4 py-2 rounded-lg">{profileData[item.field]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Bio Section */}
          <div className="mt-6 space-y-2">
            <label className="text-gray-300 font-medium">Bio</label>
            {isEditing ? (
              <textarea
                value={editData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none transition-colors resize-none"
              />
            ) : (
              <p className="text-white bg-gray-800/50 px-4 py-2 rounded-lg">{profileData.bio}</p>
            )}
          </div>
        </motion.div>

        {/* Stats and Achievements */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Statistiques</h3>
            <div className="space-y-4">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <stat.icon className="text-white text-sm" />
                    </div>
                    <span className="text-gray-300 text-sm">{stat.label}</span>
                  </div>
                  <span className="text-white font-semibold">{stat.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Accomplissements</h3>
            <div className="space-y-3">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors"
                >
                  <div className={`w-10 h-10 bg-gradient-to-r ${achievement.color} rounded-lg flex items-center justify-center`}>
                    <achievement.icon className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-sm">{achievement.title}</h4>
                    <p className="text-gray-400 text-xs">{achievement.description}</p>
                  </div>
                  <FaCheck className="text-green-400" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
