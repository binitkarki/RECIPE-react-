import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RecipesAPI, CommentsAPI, BookmarksAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { IoIosTimer } from "react-icons/io";
import { IoPeopleSharp } from "react-icons/io5";
import { SiLevelsdotfyi } from "react-icons/si";
import { FaEye, FaHeart, FaBookmark } from "react-icons/fa";
import { IoArrowBack } from "react-icons/io5";
import "../styles/RecipeDetail.css";

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const [recipe, setRecipe] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);

  const incrementedRef = useRef(false);

  useEffect(() => {
    const load = async () => {
      const res = await RecipesAPI.detail(id);
      setRecipe(res.data);
      setLikesCount(res.data.likes_count || 0);
      setLiked(res.data.liked); 

      const c = await CommentsAPI.list(id);
      setComments(c.data);

      if (accessToken) {
        const b = await BookmarksAPI.list();
        const found = b.data.find((x) => x.recipe.id === Number(id));
        setBookmarked(!!found);
        setBookmarkId(found ? found.id : null);
      }

      if (!incrementedRef.current) {
        incrementedRef.current = true;
        try {
          const v = await RecipesAPI.view(id);
          setRecipe((prev) => (prev ? { ...prev, views: v.data.views } : prev));
        } catch {}
      }
    };
    load().catch(() => {});
  }, [id, accessToken]);

  if (!recipe) return <p>Loading...</p>;

  const toggleBookmark = async () => {
    if (!accessToken) return alert("Please log in to bookmark recipes.");
    if (bookmarked && bookmarkId) {
      await BookmarksAPI.remove(bookmarkId);
      setBookmarked(false);
      setBookmarkId(null);
    } else {
      const res = await BookmarksAPI.add(recipe.id);
      setBookmarked(true);
      setBookmarkId(res.data.id);
    }
  };

  const toggleLike = async () => {
    if (!accessToken) return alert("Please log in to like recipes.");
    const res = await RecipesAPI.like(recipe.id);
    setLiked(res.data.liked);
    setLikesCount(res.data.likes_count);
  };

  const addComment = async () => {
    if (!accessToken) return alert("Please log in to comment.");
    if (!commentText.trim()) return;
    const res = await CommentsAPI.add(id, commentText.trim());
    setComments((prev) => [res.data, ...prev]);
    setCommentText("");
  };

  const formattedDate = recipe.created_at ? new Date(recipe.created_at).toLocaleDateString() : "";

  const units = ['cup','cups','tbsp','tablespoon','tablespoons','tsp','teaspoon','teaspoons','g','kg','ml','l','slice','slices','packet','packets'];
  const splitAmount = (line) => {
    const parts = line.split(' ');
    if (parts.length >= 2) {
      const maybeUnit = parts[1].toLowerCase();
      if (units.includes(maybeUnit)) return [parts.slice(0,2).join(' '), parts.slice(2).join(' ')];
    }
    return [parts[0], parts.slice(1).join(' ')];
  };

  return (
    <div className="detail-page">
      <div className="topbar">
        <span className="back-arrow" onClick={() => navigate(-1)}>
          <IoArrowBack />
        </span>
      </div>

      {/* Hero Section */}
      <section className="hero" style={{ backgroundImage: `url(${recipe.image})` }}>
        <div className="hero-overlay">
          <div className="title-block">
            <h1>{recipe.title}</h1>
            <small className="date">{formattedDate}</small>
            <div className="meta-row">
              <span><IoIosTimer /> {recipe.cooking_time} min</span>
              <span><IoPeopleSharp /> {recipe.servings}</span>
              <span><SiLevelsdotfyi /> {recipe.difficulty}</span>
            </div>
          </div>

          <div className="hero-actions">
            <div className="pill"><FaEye /> {recipe.views ?? 0}</div>
            <button
              type="button"
              className={`like ${liked ? "active" : ""}`}
              onClick={toggleLike}
            >
              <FaHeart className="icon-heart" /> {likesCount}
            </button>
            <button
              type="button"
              className={`bookmark ${bookmarked ? "active" : ""}`}
              onClick={toggleBookmark}
            >
              <FaBookmark className="icon-bookmark" />
            </button>
          </div>
        </div>
        <div className="fade-bottom" />
      </section>

      {/* Main Content */}
      <section className="stream">
        <div className="stream-col scroll-hover">
          <h2>Ingredients</h2>
          <ul className="plain-list">
            {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0
              ? recipe.ingredients.map((line, i) => {
                  const [amt, rest] = splitAmount(line);
                  return (
                    <li key={i}>
                      <strong className="qty-gold">{amt}</strong> {rest}
                    </li>
                  );
                })
              : <li>No ingredients available</li>}
          </ul>
        </div>

        <div className="stream-col scroll-hover">
          <h2>Steps</h2>
          <ul className="steps-list">
            {Array.isArray(recipe.steps) && recipe.steps.length > 0
              ? recipe.steps.map((step, i) => (
                  <li key={i}>
                    <span className="step-circle">{i + 1}</span> {step}
                  </li>
                ))
              : <li>No steps available</li>}
          </ul>
        </div>
      </section>

      {/* Comments */}
      <section className="comments">
        <h3>Comments</h3>
        <div className="comment-form compact">
          <input
            type="text"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button onClick={addComment}>Post</button>
        </div>
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id}>
              <div className="comment-header">
                <img className="avatar" src={`https://ui-avatars.com/api/?name=${c.author}`} alt={c.author} />
                <strong>{c.author}</strong>
                <span>{c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}</span>
              </div>
              <p>{c.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
