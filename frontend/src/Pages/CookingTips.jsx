import { useEffect, useState } from 'react';
import { getAllTips, getTipOfTheDay, searchTips, getFeaturedTips, getTipsByCategory, rateTip, deleteTip, updateTip, getUserRating, getMyTips, getTipComments, addTipComment, updateTipComment, deleteTipComment } from '../api/cookingTipsApi';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import tipBg from '../assets/Tip.jpg';
import { format } from 'date-fns';
import { StarIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';

if (!localStorage.getItem('tempUserId')) {
  localStorage.setItem('tempUserId', crypto.randomUUID());
}
const loggedInUserId = localStorage.getItem('userId'); // Set this on login!
const tempUserId = localStorage.getItem('tempUserId');
const currentUserId = loggedInUserId || tempUserId;

const CookingTips = () => {
  const [tips, setTips] = useState([]);
  const [search, setSearch] = useState('');
  const [filteredTips, setFilteredTips] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [featuredTips, setFeaturedTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [editLoading, setEditLoading] = useState(null);
  const [editingTip, setEditingTip] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: 'Storage'
  });
  const [ratingLoading, setRatingLoading] = useState(null);
  const [ratingSuccess, setRatingSuccess] = useState(null);
  const [hoverRating, setHoverRating] = useState({});
  const [userRatings, setUserRatings] = useState({});
  const [showMyTips, setShowMyTips] = useState(false); // Add toggle for my tips
  const [selectedTip, setSelectedTip] = useState(null);
  // Review section state
  const [tipUserRating, setTipUserRating] = useState(0);
  const [tipHoverRating, setTipHoverRating] = useState(0);
  const [tipReviewText, setTipReviewText] = useState('');
  const [tipReviewUserName, setTipReviewUserName] = useState('');
  const [tipReviews, setTipReviews] = useState([]);
  const [tipComments, setTipComments] = useState([]);
  const [tipCommentText, setTipCommentText] = useState('');
  const [tipCommentUserName, setTipCommentUserName] = useState('');
  const [tipCommentRating, setTipCommentRating] = useState(0);
  const [tipCommentHover, setTipCommentHover] = useState(0);
  const [editingTipCommentId, setEditingTipCommentId] = useState(null);
  const [editTipCommentText, setEditTipCommentText] = useState('');

  // Helper to get the most-rated tip
  const getMostRatedTip = (tipsArr) => {
    if (!tipsArr || tipsArr.length === 0) return null;
    // Find tip with highest ratingCount; break ties by latest createdAt
    return tipsArr.reduce((prev, curr) => {
      if (curr.ratingCount > prev.ratingCount) return curr;
      if (curr.ratingCount === prev.ratingCount) {
        // If tie, show the latest tip
        return new Date(curr.createdAt) > new Date(prev.createdAt) ? curr : prev;
      }
      return prev;
    }, tipsArr[0]);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        let tipsRes;
        if (showMyTips) {
          tipsRes = await getMyTips();
        } else {
          tipsRes = await getAllTips();
        }
        const featuredRes = await getFeaturedTips();
        setTips(tipsRes.data);
        setFilteredTips(tipsRes.data);
        setFeaturedTips(featuredRes.data);

        if (tipsRes.data && tipsRes.data.length > 0) {
          await loadUserRatings(tipsRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch tips:', err);
        setTips([]);
        setFilteredTips([]);
        setFeaturedTips([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [showMyTips]); 

  useEffect(() => {
    if (selectedTip) {
      getTipComments(selectedTip.id).then(res => setTipComments(res.data));
    }
  }, [selectedTip]);

  const loadUserRatings = async (tips) => {
    try {
      const ratingPromises = tips.map(tip => 
        getUserRating(tip.id, currentUserId)
          .then(response => ({
            tipId: tip.id,
            rating: response.data
          }))
          .catch(() => ({
            tipId: tip.id,
            rating: null
          }))
      );
      
      const ratings = await Promise.all(ratingPromises);
      const ratingsMap = {};
      ratings.forEach(({ tipId, rating }) => {
        if (rating !== null) {
          ratingsMap[tipId] = rating;
        }
      });
      setUserRatings(ratingsMap);
    } catch (error) {
      console.error('Failed to load user ratings:', error);
      setUserRatings({});
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearch(query);

    if (!query) {
      setFilteredTips(tips);
    } else {
      try {
        let res;
        if (showMyTips) {
          // Filter my tips locally
          const filtered = tips.filter(tip =>
            tip.title.toLowerCase().includes(query.toLowerCase())
          );
          setFilteredTips(filtered);
        } else {
          res = await searchTips(query);
          setFilteredTips(res.data);
        }
      } catch (err) {
        console.error('Search failed:', err);
      }
    }
  };

  const handleCategoryChange = async (category) => {
    setSelectedCategory(category);
    if (category === 'all') {
      setFilteredTips(tips);
    } else {
      try {
        if (showMyTips) {
          // Filter my tips locally
          const filtered = tips.filter(tip => tip.category === category);
          setFilteredTips(filtered);
        } else {
          const res = await getTipsByCategory(category);
          setFilteredTips(res.data);
        }
      } catch (err) {
        console.error('Category filter failed:', err);
      }
    }
  };

  const handleRate = async (id, rating) => {
    try {
      setRatingLoading(id);
      await rateTip(id, rating, currentUserId);
      setRatingSuccess(id);

      // Update local user ratings
      setUserRatings(prev => ({
        ...prev,
        [id]: rating
      }));

      // FIX: Fetch only relevant tips after rating
      let updatedTips;
      if (showMyTips) {
        updatedTips = await getMyTips();
      } else {
        updatedTips = await getAllTips();
      }
      setTips(updatedTips.data);
      setFilteredTips(updatedTips.data);

      setTimeout(() => {
        setRatingSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Rating failed:', err);
      alert('Failed to rate tip. Please try again.');
    } finally {
      setRatingLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this tip?')) {
      try {
        setDeleteLoading(id);
        await deleteTip(id); // Auth handled in API
        // Refresh tips after deletion
        const updatedTips = showMyTips ? await getMyTips() : await getAllTips();
        setTips(updatedTips.data);
        setFilteredTips(updatedTips.data);
      } catch (err) {
        console.error('Delete failed:', err);
        alert('Failed to delete tip. Please try again.');
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const handleEdit = (tip) => {
    setEditingTip(tip);
    setEditForm({
      title: tip.title,
      description: tip.description,
      category: tip.category
    });
  };

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTip) return;

    try {
      setEditLoading(true);
      await updateTip(editingTip.id, editForm); // Auth handled in API
      // Refresh tips after update
      const updatedTips = showMyTips ? await getMyTips() : await getAllTips();
      setTips(updatedTips.data);
      setFilteredTips(updatedTips.data);
      setEditingTip(null);
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to update tip. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleTipReviewSubmit = (e) => {
    e.preventDefault();
    if (!selectedTip) return;
  
    // Create a new review object
    const newReview = {
      id: Date.now(), // Use a better unique id in production
      user: tipReviewUserName || 'Anonymous',
      text: tipReviewText,
      rating: tipUserRating,
      time: new Date().toISOString(),
    };
  
    // Add the new review to the tipReviews array
    setTipReviews(prev => [newReview, ...prev]);
  
    // Reset form fields
    setTipReviewText('');
    setTipUserRating(0);
  };

  const handleTipCommentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTip) return;
    const comment = {
      text: tipCommentText,
      rating: tipCommentRating,
      userName: tipCommentUserName,
    };
    const res = await addTipComment(selectedTip.id, comment);
    setTipComments([res.data, ...tipComments]);
    setTipCommentText('');
    setTipCommentRating(0);
  };

  const handleTipCommentEdit = async (e, commentId) => {
    e.preventDefault();
    const comment = {
      text: editTipCommentText,
      rating: tipCommentRating,
    };
    const res = await updateTipComment(selectedTip.id, commentId, comment);
    setTipComments(tipComments.map(c => c.id === commentId ? res.data : c));
    setEditingTipCommentId(null);
  };

  const handleTipCommentDelete = async (commentId) => {
    await deleteTipComment(selectedTip.id, commentId);
    setTipComments(tipComments.filter(c => c.id !== commentId));
  };

  const categoryColors = {
    Storage: 'bg-blue-200 text-blue-800',
    Prep: 'bg-green-200 text-green-800',
    Substitutes: 'bg-yellow-200 text-yellow-800',
  };

  const renderStars = (tip, isTipOfDay = false) => {
    const currentHover = hoverRating[tip.id] || 0;
    const userRating = userRatings[tip.id];
    // Priority: hover > userRating > averageRating
    const displayRating = currentHover ? currentHover : (userRating ? userRating : Math.round(tip.averageRating));

    return (
      <div className="flex space-x-1 relative">
        {[1, 2, 3, 4, 5].map((star) => (
          <div key={star} className="relative">
            <button
              onClick={() => handleRate(tip.id, star)}
              onMouseEnter={() => setHoverRating((prev) => ({ ...prev, [tip.id]: star }))}
              onMouseLeave={() => setHoverRating((prev) => ({ ...prev, [tip.id]: 0 }))}
              disabled={ratingLoading === tip.id}
              className={`text-2xl transition-colors ${
                ratingLoading === tip.id
                  ? 'text-gray-300 cursor-not-allowed'
                  : (displayRating >= star 
                    ? (userRating === star ? 'text-yellow-500' : 'text-yellow-400')
                    : 'text-gray-400 hover:text-yellow-500')
              }`}
              title={userRating ? `Your rating: ${userRating} stars` : `Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
            {/* Tooltip only for this star and this tip */}
            {hoverRating[tip.id] === star && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                Rate {star} {star === 1 ? 'star' : 'stars'}
              </div>
            )}
          </div>
        ))}
        {userRating && (
          <span className="text-xs text-gray-500 ml-2">(Your rating)</span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Get the most-rated tip from filteredTips
  const mostRatedTip = getMostRatedTip(filteredTips);

  return (
    <div
      className="min-h-screen bg-gray-900 bg-cover bg-center py-10 px-6"
      style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)), url(${tipBg})`,
        backgroundAttachment: "fixed"
      }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">🍳 Cooking Tips & Hacks</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowMyTips(false)}
              className={`px-4 py-2 rounded-lg font-semibold ${!showMyTips ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              All Tips
            </button>
            <button
              onClick={() => setShowMyTips(true)}
              className={`px-4 py-2 rounded-lg font-semibold ${showMyTips ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              My Tips
            </button>
            <Link
              to="/addtip"
              className="bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600 transition font-semibold shadow"
            >
              Share Your Tip
            </Link>
          </div>
        </div>

        {/* Most Rated Tip Card */}
        {mostRatedTip && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-amber-100 via-yellow-50 to-amber-200 border-l-8 border-amber-500 p-8 mb-10 rounded-2xl shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-3xl font-bold text-amber-700 mb-2 flex items-center gap-2">
                  <span role="img" aria-label="star">⭐</span>
                  Most Rated Tip
                </h2>
                <div className="flex flex-col gap-1">
                  <span className={`inline-block px-3 py-1 text-sm rounded-full ${categoryColors[mostRatedTip.category]}`}>
                    {mostRatedTip.category}
                  </span>
                  <span className="text-gray-700 font-medium">
                    Posted by <span className="text-blue-700">{mostRatedTip.userDisplayName}</span>
                  </span>
                  {mostRatedTip.createdAt && (
                    <span className="text-gray-500 text-sm">
                      {format(new Date(mostRatedTip.createdAt), 'PPpp')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-yellow-600 font-bold text-xl flex items-center gap-1">
                  ⭐ {Math.round(mostRatedTip.averageRating)}
                </span>
                <span className="text-gray-500 text-sm">
                  ({mostRatedTip.ratingCount} ratings)
                </span>
              </div>
            </div>
            <h3 className="text-2xl font-semibold mb-2">{mostRatedTip.title}</h3>
            <p className="text-gray-700 mb-4">{mostRatedTip.description}</p>
            <div className="flex items-center justify-between">
              {renderStars(mostRatedTip, true)}
              {mostRatedTip.featured && (
                <span className="text-amber-500 text-base ml-4">✨ Featured</span>
              )}
            </div>
          </motion.div>
        )}

        {/* Featured Tips Section */}
        {featuredTips.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">✨ Featured Tip</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredTips.map((tip) => (
                <motion.div
                  key={tip.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-4 rounded-lg shadow-md border border-amber-200"
                >
                  <h3 className="font-semibold mb-2">{tip.title}</h3>
                  <p className="text-gray-600 mb-2">{tip.description}</p>
                  <div className={`inline-block px-2 py-1 text-sm rounded-full ${categoryColors[tip.category]}`}>
                    {tip.category}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4">
          <input
            type="text"
            placeholder="Search cooking tips..."
            value={search}
            onChange={handleSearch}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleCategoryChange('all')}//handleCategoryChange('all')}
              className={`px-4 py-2 rounded-full ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            {['Storage', 'Prep', 'Substitutes'].map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-full ${
                  selectedCategory === category
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Tips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTips.length > 0 ? (
            filteredTips.map((tip) => (
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-6 mb-6 transition hover:shadow-2xl relative cursor-pointer"
                onClick={() => setSelectedTip(tip)}
              >
                {/* Only show edit/delete if tip.userId matches current user or in My Tips */}
                {(showMyTips || tip.userId === localStorage.getItem('userId')) && (
                  <div className="absolute top-4 right-4 flex space-x-2">
                    <button
                      onClick={e => { e.stopPropagation(); handleEdit(tip); }}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                      title="Edit tip"
                    >
                      {/* ...edit icon... */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(tip.id); }}
                      disabled={deleteLoading === tip.id}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete tip"
                    >
                      {/* ...delete icon... */}
                      {deleteLoading === tip.id ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                <div className="flex flex-col gap-1 mb-2">
                  <span className="text-gray-700 font-medium">
                    Posted by <span className="text-blue-700">{tip.userDisplayName}</span>
                    {tip.createdAt && (
                      <span className="text-gray-500 text-sm ml-2">
                        {format(new Date(tip.createdAt), 'PPpp')}
                      </span>
                    )}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-3 pr-16">{tip.title}</h3>
                <p className="text-gray-700 mb-4">{tip.description}</p>
                {/* Rating and review count */}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-yellow-600 font-medium">
                    ⭐ {Math.round(tip.averageRating)}
                  </span>
                  <span className="text-gray-500 text-sm">
                    ({tip.ratingCount} ratings, {tip.reviewCount || 0} reviews)
                  </span>
                </div>
                {/* ...rest of tip card... */}
                <div className="flex flex-col space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm px-3 py-1 rounded-full ${categoryColors[tip.category]}`}>
                      {tip.category}
                    </span>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      {renderStars(tip)}
                      {tip.featured && (
                        <span className="text-amber-500 text-sm">✨ Featured</span>
                      )}
                    </div>
                    {ratingLoading === tip.id && (
                      <div className="text-sm text-gray-500 flex items-center">
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating rating...
                      </div>
                    )}
                    {ratingSuccess === tip.id && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-green-600"
                      >
                        Rating updated successfully!
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500 py-8">No tips found.</p>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingTip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-lg"
          >
            <h3 className="text-xl font-semibold mb-4">Edit Tip</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={editForm.title}
                  onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditChange}
                  rows="4"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  value={editForm.category}
                  onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="Storage">Storage</option>
                  <option value="Prep">Prep</option>
                  <option value="Substitutes">Substitutes</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingTip(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className={`px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 ${
                    editLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {editLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </span>
                  ) : (
                    'Update Tip'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Tip Details Modal */}
      {selectedTip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            style={{ width: '700px' }}
          >
            <h3 className="text-2xl font-bold mb-2">{selectedTip.title}</h3>
            <div className="mb-2 text-gray-700">{selectedTip.description}</div>
            <div className={`inline-block px-3 py-1 text-sm rounded-full ${categoryColors[selectedTip.category]}`}>
              {selectedTip.category}
            </div>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-blue-700 font-medium">By {selectedTip.userDisplayName}</span>
              <span className="text-gray-500 text-sm">{selectedTip.createdAt && format(new Date(selectedTip.createdAt), 'PPpp')}</span>
            </div>

            {/* --- Tip Review Section --- */}
            <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Community Reviews</h2>
              <form onSubmit={handleTipCommentSubmit} className="mb-8">
                <input
                  type="text"
                  value={tipCommentUserName}
                  onChange={e => setTipCommentUserName(e.target.value)}
                  placeholder="Display Name"
                  className="w-full border border-gray-300 rounded-lg p-2 mb-2"
                  required
                />
                <textarea
                  value={tipCommentText}
                  onChange={e => setTipCommentText(e.target.value)}
                  placeholder="Share your thoughts about this tip..."
                  className="w-full border border-gray-300 rounded-lg p-3 mb-2"
                  rows="3"
                  required
                />
                <div className="flex items-center mb-2">
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setTipCommentRating(star)}
                      onMouseEnter={() => setTipCommentHover(star)}
                      onMouseLeave={() => setTipCommentHover(0)}
                      className="focus:outline-none"
                    >
                      <span className={`text-2xl ${(tipCommentHover || tipCommentRating) >= star ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-500">{tipCommentRating > 0 ? `${tipCommentRating} star${tipCommentRating !== 1 ? 's' : ''}` : 'Select rating'}</span>
                </div>
                <button
                  type="submit"
                  disabled={!tipCommentText.trim() || !tipCommentUserName.trim() || tipCommentRating === 0}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Submit Review
                </button>
              </form>
              {tipComments.length > 0 ? (
                <div className="space-y-6">
                  {tipComments.map(comment => (
                    <div key={comment.id} className="border-b border-gray-200 pb-6 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">{comment.userName}</h3>
                        <span className="text-sm text-gray-500">{new Date(comment.time).toLocaleString()}</span>
                      </div>
                      <div className="flex mb-2">
                        {[1,2,3,4,5].map(star => (
                          <span key={star} className={`text-xl ${(comment.rating || 0) >= star ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                        ))}
                      </div>
                      {editingTipCommentId === comment.id ? (
                        <form onSubmit={e => handleTipCommentEdit(e, comment.id)}>
                          <textarea
                            value={editTipCommentText}
                            onChange={e => setEditTipCommentText(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 mb-2"
                            rows="2"
                          />
                          <button type="submit" className="mr-2 px-3 py-1 bg-blue-600 text-white rounded">Update</button>
                          <button type="button" onClick={() => setEditingTipCommentId(null)} className="px-3 py-1">Cancel</button>
                        </form>
                      ) : (
                        <>
                          <p className="text-gray-700 mb-2">{comment.text}</p>
                          {comment.userId === currentUserId && (
                            <div className="flex space-x-2">
                              <button onClick={() => { setEditingTipCommentId(comment.id); setEditTipCommentText(comment.text); setTipCommentRating(comment.rating); }} className="text-blue-600">Edit</button>
                              <button onClick={() => handleTipCommentDelete(comment.id)} className="text-red-600">Delete</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">No reviews yet</div>
              )}
            </div>
            {/* --- End Tip Review Section --- */}

            <button
              className="mt-6 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              onClick={() => setSelectedTip(null)}
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CookingTips;
