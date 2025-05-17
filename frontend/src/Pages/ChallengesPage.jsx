import { useState, useEffect, useContext } from 'react';
import { 
  getAllChallenges, 
  getActiveChallenges, 
  getPastChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  submitToChallenge,
  voteForSubmission,
  getChallengeLeaderboard,
  getAllActiveChallenges 
} from '../api/challengeApi';
import { getAllRecipes } from '../api/recipeApi';
import { AuthContext } from '../context/AuthContext';

const ChallengesPage = () => {
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [pastChallenges, setPastChallenges] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    theme: '',
    startDate: '',
    endDate: '',
    file: null
  });
  const [submissionData, setSubmissionData] = useState({
    recipeId: ''
  });
  const [toast, setToast] = useState(null);
  const [showTopButton, setShowTopButton] = useState(false);
  const [showChallengeWall, setShowChallengeWall] = useState(false); 
  const [allActiveChallenges, setAllActiveChallenges] = useState([]);
  const { user } = useContext(AuthContext);
  const [challengeToDelete, setChallengeToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filteredChallenges = activeChallenges.filter((challenge) =>
    challenge.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Add this for Challenge Wall search
  const filteredAllActiveChallenges = allActiveChallenges.filter((challenge) =>
    challenge.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!user?.id) return;
    fetchChallenges(user.id);
    fetchRecipes(); // This is correct: fetches all recipes, not filtered by user
    const handleScroll = () => {
      setShowTopButton(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [user]);

  useEffect(() => {
    if (showChallengeWall) {
      fetchAllActiveChallenges();
    }
  }, [showChallengeWall]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchChallenges = async (userId) => {
    try {
      const [activeRes, pastRes] = await Promise.all([
        getActiveChallenges(userId),
        getPastChallenges(userId)
      ]);
      setActiveChallenges(activeRes.data);
      setPastChallenges(pastRes.data);
    } catch (error) {
      console.error('Error fetching challenges:', error);
      showToast('Error fetching challenges');
    }
  };

  const fetchRecipes = async () => {
    try {
      const res = await getAllRecipes();
      // Ensure each recipe has an 'id' field for matching with submission.recipeId
      setRecipes(res.data.map(r => ({ ...r, id: r._id || r.id })));
    } catch (error) {
      console.error('Error fetching recipes:', error);
      showToast('Error fetching recipes');
    }
  };

  const fetchLeaderboard = async (id) => {
    try {
      const res = await getChallengeLeaderboard(id, user.id);
      setLeaderboard(res.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      showToast('Error fetching leaderboard');
    }
  };

  const fetchAllActiveChallenges = async () => {
    try {
      const res = await getAllActiveChallenges();
      setAllActiveChallenges(res.data);
    } catch (error) {
      console.error('Error fetching all active challenges:', error);
      showToast('Error fetching all active challenges');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('theme', formData.theme);
      // Only append if not empty
      if (formData.startDate) data.append('startDate', formData.startDate);
      if (formData.endDate) data.append('endDate', formData.endDate);
      if (formData.file) data.append('file', formData.file);
      data.append('userId', user.id);

      if (editingChallenge) {
        await updateChallenge(editingChallenge.id, data);
        showToast('Challenge updated successfully');
      } else {
        await createChallenge(data);
        showToast('Challenge created successfully');
      }
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        theme: '',
        startDate: '',
        endDate: '',
        file: null
      });
      setEditingChallenge(null);
      fetchChallenges(user.id);
    } catch (error) {
      console.error('Error saving challenge:', error);
      showToast('Error saving challenge');
    }
  };

  const handleEdit = (challenge) => {
    // Defensive: handle missing/invalid dates
    const safeDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
    };
    setEditingChallenge(challenge);
    setFormData({
      title: challenge.title,
      description: challenge.description,
      theme: challenge.theme,
      startDate: safeDate(challenge.startDate),
      endDate: safeDate(challenge.endDate),
      file: null
    });
    setShowForm(true);
  };

  const handleDeleteRequest = (id) => {
    setChallengeToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!challengeToDelete) return;
    try {
      await deleteChallenge(challengeToDelete, user.id);
      showToast('Challenge deleted successfully');
      fetchChallenges(user.id);
    } catch (error) {
      console.error('Error deleting challenge:', error);
      showToast('Error deleting challenge');
    }
    setShowDeleteConfirm(false);
    setChallengeToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setChallengeToDelete(null);
  };

  const handleSelectChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    fetchLeaderboard(challenge.id);
  };

  const handleSubmitRecipe = async (e) => {
    e.preventDefault();
    try {
      await submitToChallenge(selectedChallenge.id, submissionData.recipeId, user.id);
      showToast('Recipe submitted successfully');
      fetchChallenges(user.id);
      fetchLeaderboard(selectedChallenge.id);
      setSubmissionData({ recipeId: '' });
    } catch (error) {
      console.error('Error submitting recipe:', error);
      showToast('Error submitting recipe');
    }
  };

  const handleVote = async (recipeId) => {
    try {
      await voteForSubmission(selectedChallenge.id, recipeId, user.id);
      showToast('Vote submitted successfully');
      fetchLeaderboard(selectedChallenge.id);
    } catch (error) {
      console.error('Error voting:', error);
      showToast('Error submitting vote');
    }
  };

  const handleCreateChallenge = () => {
    setEditingChallenge(null); 
    setFormData({ 
      title: '',
      description: '',
      theme: '',
      startDate: '',
      endDate: '',
      file: null
    });
    setShowForm(true); 
  };

  return (
    <div>
      <div
        className="min-h-screen bg-gray-50"
        style={{
          backgroundImage: "url('http://localhost:8080/uploads/challenges/food-4k-1vrcb0mw76zcg4qf.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        
        <div className="w-full shadow-md py-4 mb-8" style={{background: "#fff"}}>
          <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-6 items-center">
            <button
              onClick={() => {
                setShowChallengeWall(false);
                setSelectedChallenge(null);
              }}
              className="flex flex-col items-center group focus:outline-none"
              aria-label="All Challenges"
            >
              <img
                src="https://kristineskitchenblog.com/wp-content/uploads/2023/02/icons-slowcooker.png"
                alt="Slow Cooker Icon"
                className={`w-20 h-20 rounded-full shadow group-hover:scale-105 transition ${!showChallengeWall ? 'ring-4 ring-amber-400' : ''}`}
              />
              <span className={`mt-2 text-sm font-semibold group-hover:text-amber-600 ${!showChallengeWall ? 'text-amber-600' : 'text-gray-700'}`}>
                My Challenges
              </span>
            </button>
            <button
            onClick={() => {
              setShowChallengeWall(true);
              setSelectedChallenge(null);
            }}
            className="flex flex-col items-center group focus:outline-none"
            aria-label="Challenge Wall"
          >
            <img
              src="https://kristineskitchenblog.com/wp-content/uploads/2023/02/icons-sides.png"
              alt="Sides Icon"
              className={`w-20 h-20 rounded-full shadow group-hover:scale-105 transition ${showChallengeWall ? 'ring-4 ring-amber-400' : ''}`}
            />
            <span className={`mt-2 text-sm font-semibold group-hover:text-amber-600 ${showChallengeWall ? 'text-amber-600' : 'text-gray-700'}`}>
              Challenges
            </span>
          </button>
          </div>
          <div className="flex justify-center mt-6">
          <button
            onClick={handleCreateChallenge}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-bold rounded-full shadow hover:bg-amber-600 hover:scale-105 transition-all duration-200 text-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Challenge
          </button>
        </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6" style={{background: "transparent"}}>
          {/* Challenge Form */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold">
                      {editingChallenge ? 'Edit Challenge' : 'Create Challenge'}
                    </h2>
                    <button 
                      onClick={() => {
                        setShowForm(false);
                        setEditingChallenge(null); 
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Title</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Challenge title"
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Theme</label>
                      <input
                        type="text"
                        name="theme"
                        value={formData.theme}
                        onChange={handleInputChange}
                        placeholder="Theme"
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Start Date</label>
                      <input
                        type="datetime-local"
                        name="startDate"
                        value={formData.startDate || new Date().toISOString().slice(0, 16)} 
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        min={new Date().toISOString().slice(0, 16)} 
                        required
                        disabled={!!editingChallenge} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">End Date</label>
                      <input
                        type="datetime-local"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        min={
                          editingChallenge
                            ? new Date().toISOString().slice(0, 16) 
                            : formData.startDate || new Date().toISOString().slice(0, 16) 
                        }
                        required
                      />
                    </div>
                  </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Description</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Description"
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        rows="4"
                        required
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Image</label>
                      {editingChallenge && editingChallenge.imageUrl && (
                        <div className="mb-4">
                          <img
                            src={`http://localhost:8080${editingChallenge.imageUrl}`}
                            alt="Current Challenge"
                            className="w-full h-64 object-cover rounded-lg"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                            }}
                          />
                        </div>
                      )}
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                        accept="image/*"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full p-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
                    >
                      {editingChallenge ? 'Update Challenge' : 'Create Challenge'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
          
          {/* Search Bar */}
          <div className="max-w-7xl mx-auto mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challenges by title..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

  {showChallengeWall ? (
  <div className="max-w-7xl mx-auto mt-12 flex flex-col items-center">
    <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Challenges</h2>
    <div className="w-full flex justify-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center w-full">
        {filteredAllActiveChallenges.length > 0 ? (
          filteredAllActiveChallenges.map((challenge) => (
            <div
              key={challenge.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col"
              style={{ width: 370, minHeight: 420, maxWidth: 400 }}
              onClick={() => handleSelectChallenge(challenge)} 
            >
              <div className="relative">
                {challenge.imageUrl ? (
                  <img
                    src={`http://localhost:8080${challenge.imageUrl}`}
                    alt={challenge.title}
                    className="w-full h-64 object-cover hover:opacity-90 transition-opacity duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="h-64 w-full bg-gradient-to-r from-gray-100 to-gray-300 flex items-center justify-center">
                    <span className="text-gray-500 text-lg">No Image Available</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3">
                  <span className="px-3 py-1 bg-black bg-opacity-70 text-white text-sm rounded-full">
                    {challenge.theme || "General"}
                  </span>
                </div>
                {/* Move date badge to bottom right over the image */}
                <div className="absolute bottom-3 right-3">
                  <span className="bg-blue-100 text-blue-500 font-bold text-xs px-3 py-1 rounded-full shadow">
                    Ends on {new Date(challenge.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{challenge.title}</h3>
                {/* Remove date from here */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {challenge.description || "No description available."}
                </p>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleSelectChallenge(challenge);
                    }}
                    className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-600 mt-4">No active challenges found</h3>
          </div>
        )}
      </div>
    </div>
  </div>
) : (
  
  <>
  {/* Active Challenges */}
  <div className="max-w-7xl mx-auto flex flex-col items-center">
    <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Active Challenges</h2>
    <div className="w-full flex justify-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center w-full">
        {filteredChallenges.length > 0 ? (
          filteredChallenges.map((challenge) => (
            <div
              key={challenge.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              style={{ width: 370, minHeight: 420, maxWidth: 400 }}
              onClick={() => handleSelectChallenge(challenge)} 
            >
              <div className="relative">
                {challenge.imageUrl ? (
                  <img
                    src={`http://localhost:8080${challenge.imageUrl}`}
                    alt={challenge.title}
                    className="w-full h-64 object-cover hover:opacity-90 transition-opacity duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                    }}
                  />
                ) : (
                  <div className="h-64 w-full bg-gradient-to-r from-gray-100 to-gray-300 flex items-center justify-center">
                    <span className="text-gray-500 text-lg">No Image Available</span>
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); 
                      handleEdit(challenge);
                    }}
                    className="text-2xl p-2 rounded-full bg-white bg-opacity-80 backdrop-blur-sm shadow-md text-gray-600 hover:text-black transition-all duration-300"
                    aria-label="Edit challenge"
                  >
                    ✏️
                  </button>
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className="px-3 py-1 bg-black bg-opacity-70 text-white text-sm rounded-full">
                    {challenge.theme || "General"}
                  </span>
                </div>
                {/* Move date badge to bottom right over the image */}
                <div className="absolute bottom-3 right-3">
                  <span className="bg-blue-100 text-blue-500 font-bold text-xs px-3 py-1 rounded-full shadow">
                    Ends on {new Date(challenge.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{challenge.title}</h3>
                  {/* Remove date from here */}
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {challenge.description || "No description available."}
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); 
                      handleSelectChallenge(challenge); 
                    }}
                    className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    View Details
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); 
                      handleDeleteRequest(challenge.id);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-12">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-600 mt-4">No challenges match your search</h3>
          </div>
        )}
      </div>
    </div>
  </div>

          {/* Past Challenges */}
          <div className="max-w-7xl mx-auto mt-12 flex flex-col items-center">
            <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">Past Challenges</h2>
            <div className="w-full flex justify-center">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center w-full">
                {pastChallenges.length > 0 ? (
                  pastChallenges.map(challenge => (
                    <div
                      key={challenge.id}
                      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                      style={{ width: 370, minHeight: 420, maxWidth: 400 }}
                      onClick={() => handleSelectChallenge(challenge)} 
                    >
                      <div className="relative">
                        {challenge.imageUrl ? (
                          <img
                            src={`http://localhost:8080${challenge.imageUrl}`}
                            alt={challenge.title}
                            className="w-full h-64 object-cover hover:opacity-90 transition-opacity duration-300"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="h-64 w-full bg-gradient-to-r from-gray-100 to-gray-300 flex items-center justify-center">
                            <span className="text-gray-500 text-lg">No Image Available</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); 
                              handleDeleteRequest(challenge.id);
                            }}
                            className="text-lg p-1 rounded-full bg-white bg-opacity-80 backdrop-blur-sm shadow-md text-gray-600 hover:text-red-600 transition-all duration-300"
                            aria-label="Delete challenge"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="absolute bottom-3 left-3">
                          <span className="px-3 py-1 bg-black bg-opacity-70 text-white text-sm rounded-full">
                            {challenge.theme || "General"}
                          </span>
                        </div>
                        {/* Move date badge to bottom right over the image */}
                        <div className="absolute bottom-3 right-3">
                          <span className="bg-blue-100 text-blue-500 font-bold text-xs px-3 py-1 rounded-full shadow">
                            Ends on {new Date(challenge.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-xl font-bold text-gray-800 line-clamp-2">{challenge.title}</h3>
                          {/* Remove date from here */}
                        </div>
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {challenge.description || "No description available."}
                        </p>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectChallenge(challenge);
                          }}
                          className="w-full py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-md hover:shadow-lg"
                        >
                          View Results
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-xl font-medium text-gray-600 mt-4">No past challenges found</h3>
                  </div>
                )}
              </div>
            </div>
          </div>
          </>
)}

          {/* Challenge Details Modal */}
          {(selectedChallenge) && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedChallenge.title}</h2>
                      <p className="text-gray-600">{selectedChallenge.theme}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(selectedChallenge.startDate).toLocaleString()} - {new Date(selectedChallenge.endDate).toLocaleString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => setSelectedChallenge(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>

                  {selectedChallenge.imageUrl && (
                    <img 
                      src={`http://localhost:8080${selectedChallenge.imageUrl}`}
                      alt={selectedChallenge.title}
                      className="w-full h-64 object-cover rounded-lg mb-4"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/800x400?text=No+Image';
                      }}
                    />
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-gray-700">{selectedChallenge.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Submit Recipe Section */}
                    {new Date(selectedChallenge.endDate) > new Date() && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Submit Your Recipe</h3>
                        <form onSubmit={handleSubmitRecipe} className="space-y-3">
                          <div>
                            <select
                              name="recipeId"
                              value={submissionData.recipeId}
                              onChange={(e) => setSubmissionData({ recipeId: e.target.value })}
                              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                              required
                            >
                              <option value="">Select a recipe</option>
                              {recipes.map(recipe => (
                                <option key={recipe.id} value={recipe.id}>{recipe.title}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="submit"
                            className="w-full p-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition"
                          >
                            Submit Recipe
                          </button>
                        </form>
                      </div>
                    )}

                      {/* Leaderboard Section */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Leaderboard</h3>
                        {leaderboard.length > 0 ? (
                          <div className="space-y-3">
                            {leaderboard
                              .sort((a, b) => b.votes - a.votes) 
                              .map((submission, index) => {
                                const recipe = recipes.find(r => r.id === submission.recipeId || r._id === submission.recipeId);
                                const hasVoted = submission.votedUserIds && submission.votedUserIds.includes(user.id);
                                return recipe ? (
                                  <div key={submission.recipeId} className="border rounded-lg p-3 flex justify-between items-center">
                                    <div>
                                      <h4 className="font-medium">
                                        #{index + 1} {recipe.title}
                                      </h4>
                                      <p className="text-sm text-gray-500">{submission.votes} votes</p>
                                    </div>
                                    {new Date(selectedChallenge.endDate) > new Date() && (
                                      <button
                                        onClick={() => handleVote(submission.recipeId)}
                                        disabled={hasVoted}
                                        style={{
                                          backgroundColor: hasVoted ? 'green' : 'black',
                                          color: 'white'
                                        }}
                                        className="px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition"
                                      >
                                        {hasVoted ? 'Voted' : 'Vote'}
                                      </button>
                                    )}
                                  </div>
                                ) : null;
                              })}
                          </div>
                        ) : (
                          <p className="text-gray-500">No submissions yet. Be the first to submit!</p>
                        )}
                      </div>
                    </div>
                </div>
              </div>
            </div>
          )}

          {/* Toast Notification */}
          {toast && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {toast}
            </div>
          )}

          {/* Scroll-to-top Button */}
          {showTopButton && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
              aria-label="Scroll to top"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Challenge?</h3>
                <p className="text-gray-600 mb-6">Are you sure you want to delete this challenge? This action cannot be undone.</p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={handleDeleteCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    No
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChallengesPage;