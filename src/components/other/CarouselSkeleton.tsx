// components/skeletons/CarouselSkeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface CarouselSkeletonProps {
    title?: string;
    icon?: React.ReactNode;
    borderClass?: string;
    gradientClass?: string;
}

export function CarouselSkeleton({
    title = "Loading",
    icon,
    borderClass = "border-primary/20",
    gradientClass = "from-primary/5"
}: CarouselSkeletonProps) {
    return (
        <Card className={`border-2 ${borderClass} bg-linear-to-br ${gradientClass} via-transparent to-transparent shadow-sm transition-all`}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            {icon || <Skeleton className="h-6 w-6 rounded" />}
                            <Skeleton className="h-7 w-32" />
                        </div>
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2 ml-4">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <Skeleton className="h-9 w-9 rounded-md" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex gap-6 overflow-hidden">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div
                            key={i}
                            className="flex-none w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                        >
                            <Card className="overflow-hidden border-2">
                                <Skeleton className="h-48 w-full rounded-b-none" />
                                <CardContent className="p-4">
                                    <div className="flex gap-2 mb-2">
                                        <Skeleton className="h-5 w-20" />
                                        <Skeleton className="h-5 w-16" />
                                    </div>
                                    <Skeleton className="h-6 w-full mb-2" />
                                    <Skeleton className="h-6 w-3/4 mb-4" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
                <div className="flex justify-center gap-2 mt-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-1.5 w-1.5 rounded-full" />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}