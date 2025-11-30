// components/analytics/PriceDistributionChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, DollarSign } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants/categories';
import { ChartWrapper } from './ChartWrapper';
import { CategoryFilter, CATEGORY_COLORS } from './CategoryFilter';
import type { PriceDistribution } from '@/lib/services';

export function PriceDistributionChart() {
    const [data, setData] = useState<PriceDistribution[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [selectedCategories]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = selectedCategories.length > 0
                ? `?categories=${selectedCategories.join(',')}`
                : '';
            const res = await fetch(`/api/analytics/price-distribution${params}`);
            const result = await res.json();
            setData(result.data || []);
        } catch (err) {
            console.error('Failed to load price distribution:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const clearFilters = () => setSelectedCategories([]);

    const getColorForCategory = (cat: PriceDistribution) => {
        if (cat.isSubcategory) {
            for (const mainCat of CATEGORIES) {
                if (mainCat.subcategories?.includes(cat.category)) {
                    return CATEGORY_COLORS[mainCat.value] || '#6b7280';
                }
            }
        }
        return CATEGORY_COLORS[cat.category] || '#6b7280';
    };

    const getCategoryKey = (cat: PriceDistribution) => {
        if (cat.isSubcategory) {
            for (const mainCat of CATEGORIES) {
                if (mainCat.subcategories?.includes(cat.category)) {
                    return mainCat.value;
                }
            }
        }
        return cat.category;
    };

    if (isLoading) {
        return (
            <ChartWrapper
                icon={DollarSign}
                title="Price Distribution"
                description="Compare pricing patterns across categories"
            >
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </ChartWrapper>
        );
    }

    const allCategories = Array.from(new Set(data.map(getCategoryKey)));

    return (
        <ChartWrapper
            icon={DollarSign}
            title="Price Distribution"
            description="Compare pricing patterns across categories"
        >
            {/* Filter Section */}
            <div className="mb-6">
                <CategoryFilter
                    selectedCategories={selectedCategories}
                    onCategoryToggle={toggleCategory}
                    onClear={clearFilters}
                    showSubcategories={true}
                />
            </div>

            {/* Chart */}
            {data.length > 0 ? (
                <>
                    <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
                        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                                dataKey="displayName"
                                angle={-45}
                                textAnchor="end"
                                height={70}
                                tick={{ fontSize: 10 }}
                                interval={0}
                            />
                            <YAxis
                                label={{ value: 'Price (AUD)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                                tick={{ fontSize: 10 }}
                            />
                            <Tooltip content={<PriceTooltip />} />

                            {/* Transparent bar for Q1 baseline */}
                            <Bar dataKey="q1" stackId="range" fill="transparent" />

                            {/* Interquartile range bar (Q1 to Q3) */}
                            <Bar dataKey={(entry) => entry.q3 - entry.q1} stackId="range">
                                {data.map((entry, index) => {
                                    const categoryKey = getCategoryKey(entry);
                                    const color = getColorForCategory(entry);
                                    const isHovered = hoveredCategory === null || hoveredCategory === categoryKey;
                                    return (
                                        <Cell
                                            key={`price-cell-${index}`}
                                            fill={color}
                                            opacity={isHovered ? 0.3 : 0.08}
                                        />
                                    );
                                })}
                            </Bar>

                            {/* Median price line */}
                            <Line
                                type="monotone"
                                dataKey="median"
                                stroke="rgb(234 88 12)"
                                strokeWidth={2}
                                dot={{ fill: 'rgb(234 88 12)', r: 4 }}
                                name="Median"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>

                    {/* Interactive Summary Cards with Legend */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
                        {data.map((item, index) => {
                            const color = getColorForCategory(item);
                            const categoryKey = getCategoryKey(item);
                            const isHovered = hoveredCategory === categoryKey;

                            return (
                                <button
                                    key={`summary-${index}`}
                                    onMouseEnter={() => setHoveredCategory(categoryKey)}
                                    onMouseLeave={() => setHoveredCategory(null)}
                                    className="p-4 rounded-lg border bg-muted/30 text-left cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5"
                                    style={{
                                        borderColor: isHovered ? color : undefined,
                                        borderWidth: isHovered ? '2px' : '1px',
                                        backgroundColor: isHovered ? `${color}08` : undefined,
                                        transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)'
                                    }}
                                >
                                    {/* Category indicator with animation */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <div
                                            className="w-3 h-3 rounded-full transition-all duration-300"
                                            style={{
                                                backgroundColor: color,
                                                transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                                                boxShadow: isHovered ? `0 0 8px ${color}50` : 'none'
                                            }}
                                        />
                                        <div className="text-xs sm:text-sm font-medium text-muted-foreground truncate transition-colors duration-300"
                                            style={{ color: isHovered ? color : undefined }}
                                        >
                                            {item.displayName}
                                        </div>
                                    </div>

                                    {/* Main price */}
                                    <div className="text-2xl sm:text-3xl font-bold mb-1 transition-all duration-300"
                                        style={{
                                            color: isHovered ? color : undefined,
                                            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
                                        }}
                                    >
                                        ${item.median}
                                    </div>

                                    {/* Details */}
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <span className="font-medium">{item.count}</span> events
                                        </span>
                                        <span className="flex items-center gap-1">
                                            Range: <span className="font-medium">${item.min}-${item.max}</span>
                                        </span>
                                    </div>

                                    {/* Average price (subtle) */}
                                    <div className="mt-2 pt-2 border-t text-xs">
                                        <span className="text-muted-foreground">Avg: </span>
                                        <span className="font-medium">${item.avgPrice}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Median Legend */}
                    <div className="mt-4 flex justify-center">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-muted/30">
                            <div className="w-3 h-0.5 bg-orange-600 rounded-full" style={{ width: '16px' }} />
                            <span className="text-xs font-medium text-muted-foreground">
                                Orange line = Median price
                            </span>
                        </div>
                    </div>
                </>
            ) : (
                <div className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">No data available</p>
                    <p className="text-xs text-muted-foreground mt-1">Select categories to view pricing</p>
                </div>
            )}
        </ChartWrapper>
    );
}

function PriceTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload as PriceDistribution;

    return (
        <div className="bg-background border-2 rounded-lg shadow-lg p-3 text-xs sm:text-sm">
            <div className="font-medium mb-2 truncate">{data.displayName}</div>
            <div className="space-y-1">
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Count:</span>
                    <span className="font-medium">{data.count} events</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Range:</span>
                    <span>${data.min} - ${data.max}</span>
                </div>
                <div className="flex justify-between gap-4 pt-1 border-t">
                    <span className="text-muted-foreground">Median:</span>
                    <span className="font-bold text-primary">${data.median}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Average:</span>
                    <span className="font-medium">${data.avgPrice}</span>
                </div>
            </div>
        </div>
    );
}