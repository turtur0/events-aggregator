// components/analytics/timeline-chart.tsx
'use client';

import { useEffect, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Loader2, Calendar } from 'lucide-react';
import type { TimelineData } from '@/lib/services/analyticsService';

const CATEGORY_COLORS: Record<string, string> = {
    music: '#8b5cf6',
    theatre: '#ec4899',
    sports: '#f59e0b',
    arts: '#10b981',
    family: '#3b82f6',
    other: '#6b7280'
};

export function TimelineChart() {
    const [data, setData] = useState<TimelineData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/analytics/timeline')
            .then(res => res.json())
            .then(result => {
                setData(result.data || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to load timeline:', err);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Events Timeline
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    // Get all categories present in data
    const categories = Array.from(
        new Set(
            data.flatMap(item =>
                Object.keys(item).filter(k => k !== 'month' && k !== 'total')
            )
        )
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Events Timeline
                </CardTitle>
                <CardDescription>
                    Event distribution over the next 6 months by category
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis
                            dataKey="month"
                            tick={{ fontSize: 12 }}
                        />
                        <YAxis
                            label={{ value: 'Number of Events', angle: -90, position: 'insideLeft' }}
                            tick={{ fontSize: 12 }}
                        />
                        <Tooltip content={<TimelineTooltip />} />
                        <Legend />

                        {categories.map(category => (
                            <Area
                                key={category}
                                type="monotone"
                                dataKey={category}
                                stackId="1"
                                stroke={CATEGORY_COLORS[category]}
                                fill={CATEGORY_COLORS[category]}
                                fillOpacity={0.6}
                                name={category.charAt(0).toUpperCase() + category.slice(1)}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>

                {/* Peak insights */}
                {data.length > 0 && (
                    <div className="mt-6 p-4 bg-muted rounded-lg">
                        <div className="text-sm font-medium mb-2">Key Insights:</div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li>
                                • Peak month: <span className="font-medium text-foreground">
                                    {data.reduce((max, curr) => curr.total > max.total ? curr : max).month}
                                </span> ({data.reduce((max, curr) => curr.total > max.total ? curr : max).total} events)
                            </li>
                            <li>
                                • Total events: <span className="font-medium text-foreground">
                                    {data.reduce((sum, curr) => sum + curr.total, 0)}
                                </span> across {data.length} months
                            </li>
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function TimelineTooltip({ active, payload, label }: any) {
    if (!active || !payload || !payload.length) return null;

    return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
            <div className="font-medium mb-2">{label}</div>
            <div className="space-y-1">
                {payload
                    .sort((a: any, b: any) => b.value - a.value)
                    .map((entry: any) => (
                        <div key={entry.name} className="flex items-center justify-between gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded"
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="capitalize">{entry.name}:</span>
                            </div>
                            <span className="font-medium">{entry.value}</span>
                        </div>
                    ))}
                <div className="flex justify-between gap-4 pt-1 border-t mt-1 font-medium">
                    <span>Total:</span>
                    <span>{payload.reduce((sum: number, entry: any) => sum + entry.value, 0)}</span>
                </div>
            </div>
        </div>
    );
}