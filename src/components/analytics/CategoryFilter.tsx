// components/analytics/category-filter.tsx
'use client';

import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants/categories';

export const CATEGORY_COLORS: Record<string, string> = {
    music: '#8b5cf6',
    theatre: '#ec4899',
    sports: '#f59e0b',
    arts: '#10b981',
    family: '#3b82f6',
    other: '#6b7280'
};

interface CategoryFilterProps {
    selectedCategories: string[];
    onCategoryToggle: (category: string) => void;
    onClear: () => void;
    showSubcategories?: boolean;
}

export function CategoryFilter({
    selectedCategories,
    onCategoryToggle,
    onClear,
    showSubcategories = false
}: CategoryFilterProps) {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const toggleDropdown = (categoryValue: string) => {
        setOpenDropdown(openDropdown === categoryValue ? null : categoryValue);
    };

    const handleCategoryClick = (categoryValue: string) => {
        onCategoryToggle(categoryValue);
        if (!showSubcategories) {
            setOpenDropdown(null);
        }
    };

    const handleSubcategoryClick = (subcategory: string) => {
        onCategoryToggle(subcategory);
    };

    const handleBackdropClick = () => {
        setOpenDropdown(null);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Filter by Category
                </h3>
                {selectedCategories.length > 0 && (
                    <button
                        onClick={onClear}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                        <X className="h-3 w-3" />
                        Clear
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => {
                    const isSelected = selectedCategories.includes(cat.value);
                    const hasSubcategories = showSubcategories && cat.subcategories && cat.subcategories.length > 0;
                    const isOpen = openDropdown === cat.value;

                    return (
                        <div key={cat.value} className="relative">
                            <button
                                onClick={() => {
                                    if (hasSubcategories) {
                                        toggleDropdown(cat.value);
                                    } else {
                                        handleCategoryClick(cat.value);
                                    }
                                }}
                                className={`
                                    px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium 
                                    transition-all flex items-center gap-1.5
                                    ${isSelected
                                        ? 'text-white shadow-sm'
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }
                                `}
                                style={isSelected ? { backgroundColor: CATEGORY_COLORS[cat.value] } : {}}
                            >
                                {cat.label}
                                {hasSubcategories && (
                                    <ChevronDown
                                        className={`h-3 w-3 opacity-70 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                    />
                                )}
                            </button>

                            {/* Subcategory Dropdown */}
                            {hasSubcategories && isOpen && (
                                <>
                                    {/* Backdrop */}
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={handleBackdropClick}
                                    />

                                    {/* Dropdown Menu */}
                                    <div className="absolute top-full left-0 mt-1 z-20 min-w-[180px] bg-background border rounded-lg shadow-lg py-1 max-h-[300px] overflow-y-auto">
                                        <div className="px-3 py-2 border-b">
                                            <button
                                                onClick={() => {
                                                    handleCategoryClick(cat.value);
                                                }}
                                                className={`
                                                    text-xs font-medium transition-colors
                                                    ${isSelected ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
                                                `}
                                            >
                                                {isSelected ? '✓ ' : ''}All {cat.label}
                                            </button>
                                        </div>
                                        {cat.subcategories?.map(sub => {
                                            const isSubSelected = selectedCategories.includes(sub);
                                            return (
                                                <button
                                                    key={sub}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSubcategoryClick(sub);
                                                    }}
                                                    className={`
                                                        w-full px-3 py-2 text-left text-xs transition-colors flex items-center gap-2
                                                        ${isSubSelected
                                                            ? 'bg-primary/10 text-primary font-medium'
                                                            : 'hover:bg-accent'
                                                        }
                                                    `}
                                                >
                                                    <div className={`
                                                        w-3.5 h-3.5 rounded border-2 flex items-center justify-center
                                                        ${isSubSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}
                                                    `}>
                                                        {isSubSelected && (
                                                            <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                                                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    {sub}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Selected Subcategories Display */}
            {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedCategories.map(cat => {
                        // Check if it's a subcategory
                        const isSubcategory = CATEGORIES.some(c =>
                            c.subcategories?.includes(cat)
                        );

                        if (isSubcategory) {
                            return (
                                <span
                                    key={cat}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded border border-primary/20"
                                >
                                    {cat}
                                    <button
                                        onClick={() => onCategoryToggle(cat)}
                                        className="hover:text-primary/70"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            );
                        }
                        return null;
                    })}
                </div>
            )}
        </div>
    );
}