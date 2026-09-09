export function StarRating({ value, onChange, label = "Bewertung" }) {
  return (
    <div className="star-rating" role="group" aria-label={label}>
      {[1, 2, 3].map((rating) => (
        <button
          type="button"
          key={rating}
          className={value === rating ? "active" : ""}
          aria-pressed={value === rating}
          aria-label={`${rating} ${rating === 1 ? "Stern" : "Sterne"}`}
          onClick={() => onChange(rating)}
        >
          {"★".repeat(rating)}
        </button>
      ))}
    </div>
  );
}
