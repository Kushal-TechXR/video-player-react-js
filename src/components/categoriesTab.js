import React, { memo, useMemo, useCallback } from 'react';
import './css/categoriesTab.css';

import StoriesIcon from '../assets/stories.png';
import PravachanIcon from '../assets/pravachan.png';
import BhajanIcon from '../assets/bhajan.png';
import DarshanIcon from '../assets/darshan.png';

// Use Map for O(1) lookup instead of object property access
const CATEGORY_ICONS = new Map([
  ['Stories', StoriesIcon],
  ['Pravachan', PravachanIcon],
  ['Bhajan', BhajanIcon],
  ['Darshan', DarshanIcon],
]);

// Immutable array for categories
const CATEGORIES = Object.freeze(['Stories', 'Pravachan', 'Bhajan', 'Darshan']);

// Memoized category button component to prevent unnecessary re-renders
const CategoryButton = memo(function CategoryButton({ 
  category, 
  isActive, 
  icon, 
  onClick 
}) {
  // Memoize className computation
  const className = useMemo(() => {
    return `category-tab ${isActive ? 'active' : ''}`;
  }, [isActive]);

  // Memoize click handler
  const handleClick = useCallback(() => {
    onClick(category);
  }, [category, onClick]);

  return (
    <button
      key={category}
      type="button"
      onClick={handleClick}
      className={className}
    >
      <div>
        <span className="category-tab-icon">
          <img
            src={icon}
            alt={category}
            className="category-tab-icon-img"
            loading="lazy"
          />
        </span>
        <span className="category-tab-label">{category}</span>
      </div>
    </button>
  );
});

const CategoryTabs = memo(function CategoryTabs({ category, onChange }) {
  // Use Set for O(1) active category check
  const activeCategorySet = useMemo(() => {
    return new Set([category]);
  }, [category]);

  // Memoize category data array to avoid recreation on each render
  const categoryData = useMemo(() => {
    return CATEGORIES.map(cat => ({
      name: cat,
      icon: CATEGORY_ICONS.get(cat),
      isActive: activeCategorySet.has(cat)
    }));
  }, [activeCategorySet]);

  // Memoize onChange callback to prevent child re-renders
  const handleCategoryChange = useCallback((selectedCategory) => {
    onChange(selectedCategory);
  }, [onChange]);

  return (
    <div className="category-tabs">
      {categoryData.map(({ name, icon, isActive }) => (
        <CategoryButton
          key={name}
          category={name}
          isActive={isActive}
          icon={icon}
          onClick={handleCategoryChange}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  // Only re-render if category or onChange reference changes
  return prevProps.category === nextProps.category && 
         prevProps.onChange === nextProps.onChange;
});

CategoryTabs.displayName = 'CategoryTabs';

export default CategoryTabs;
