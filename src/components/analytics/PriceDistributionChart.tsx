// components/analytics/price-distribution-chart.tsx
'use client';

import { useEffect, useState } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loader2, DollarSign, X } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants/categories';
import type { PriceDistribution } from '@/lib/services/analyticsService';

const CATEGORY_COLORS: Record<string, string> = {
    music: '#8b5cf6',
    theatre: '#ec4899',
    sports: '#f59e0b',
    arts: '#10b981',
    family: '#3b82f6',
    other: '#6b7280'
};

export function PriceDistributionChart() {
    const [data, setData] = useState<PriceDistribution[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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

    const toggleSubcategory = (subcategory: string) => {
        setSelectedCategories(prev =>
            prev.includes(subcategory)
                ? prev.filter(c => c !== subcategory)
                : [...prev, subcategory]
        );
    };

    const clearFilters = () => {
        setSelectedCategories([]);
        setExpandedCategory(null);
    };

    const getColorForCategory = (cat: PriceDistribution) => {
        if (cat.isSubcategory) {
            // Find parent category
            for (const mainCat of CATEGORIES) {
                if (mainCat.subcategories?.includes(cat.category)) {
                    return CATEGORY_COLORS[mainCat.value] || '#6b7280';
                }
            }
        }
        return CATEGORY_COLORS[cat.category] || '#6b7280';
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Price Distribution by Category
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Price Distribution by Category
                </CardTitle>
                <CardDescription>
                    Select categories to compare pricing patterns
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Filter Section */}
                <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Filter Categories:</h3>
                        {selectedCategories.length > 0 && (
                            <button
                                onClick={clearFilters}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                                <X className="h-3 w-3" />
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Main Categories */}
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => {
                            const isSelected = selectedCategories.includes(cat.value);
                            const isExpanded = expandedCategory === cat.value;

                            return (
                                <div key={cat.value} className="flex flex-col gap-1">
                                    <button
                                        onClick={() => {
                                            toggleCategory(cat.value);
                                            setExpandedCategory(isExpanded ? null : cat.value);
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${isSelected
                                                ? 'text-white'
                                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                            }`}
                                        style={isSelected ? { backgroundColor: CATEGORY_COLORS[cat.value] } : {}}
                                    >
                                        {cat.label}
                                        {cat.subcategories && ` (${cat.subcategories.length})`}
                                    </button>

                                    {/* Subcategories dropdown */}
                                    {isExpanded && cat.subcategories && (
                                        <div className="ml-4 mt-1 flex flex-wrap gap-1">
                                            {cat.subcategories.map(sub => {
                                                const isSubSelected = selectedCategories.includes(sub);
                                                return (
                                                    <button
                                                        key={sub}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleSubcategory(sub);
                                                        }}
                                                        className={`px-2 py-0.5 rounded text-xs transition-colors ${isSubSelected
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary'
                                                            }`}
                                                    >
                                                        {sub}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Chart */}
                {data.length > 0 ? (
                    <>
                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis
                                    dataKey="displayName"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    tick={{ fontSize: 11 }}
                                />
                                <YAxis
                                    label={{ value: 'Price (AUD)', angle: -90, position: 'insideLeft' }}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />

                                {/* Quartile range */}
                                <Bar dataKey="q1" stackId="range" fill="transparent" name="Below Q1" />
                                <Bar
                                    dataKey={(entry) => entry.q3 - entry.q1}
                                    stackId="range"
                                    name="Q1-Q3 Range"
                                >
                                    {data.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={getColorForCategory(entry)}
                                            opacity={0.3}
                                        />
                                    ))}
                                </Bar>

                                {/* Median line */}
                                <Line
                                    type="monotone"
                                    dataKey="median"
                                    stroke="#ef4444"
                                    strokeWidth={3}
                                    name="Median Price"
                                    dot={{ fill: '#ef4444', r: 5 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>

                        {/* Summary stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                            {data.map(item => (
                                <div
                                    key={item.category}
                                    className="p-3 rounded-lg border"
                                    style={{
                                        borderLeftColor: getColorForCategory(item),
                                        borderLeftWidth: 3
                                    }}
                                >
                                    <div className="text-sm font-medium">{item.displayName}</div>
                                    <div className="text-2xl font-bold">${item.median}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {item.count} events · ${item.min}-${item.max}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="py-16 text-center text-muted-foreground">
                        <p>No data available for selected categories</p>
                        <p className="text-sm mt-2">Try selecting different categories</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function CustomTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload as PriceDistribution;

    return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
            <div className="font-medium mb-2">{data.displayName}</div>
            <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Count:</span>
                    <span className="font-medium">{data.count} events</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Min:</span>
                    <span>${data.min}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Q1:</span>
                    <span>${data.q1}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Median:</span>
                    <span className="font-bold text-red-500">${data.median}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Q3:</span>
                    <span>${data.q3}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Max:</span>
                    <span>${data.max}</span>
                </div>
                <div className="flex justify-between gap-4 pt-1 border-t">
                    <span className="text-muted-foreground">Average:</span>
                    <span className="font-medium">${data.avgPrice}</span>
                </div>
            </div>
        </div>
    );
}