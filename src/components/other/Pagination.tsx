'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const navigateToPage = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', page.toString());
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Don't render if only one page
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];

        for (let i = 1; i <= totalPages; i++) {
            const isEdgePage = i === 1 || i === totalPages;
            const isNearCurrent = i >= currentPage - 1 && i <= currentPage + 1;
            const showPage = isEdgePage || isNearCurrent;

            // Show ellipsis before current range
            if (i === currentPage - 2 && currentPage > 3) {
                pages.push(
                    <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground select-none">
                        ⋯
                    </span>
                );
            }

            if (showPage) {
                const isActive = i === currentPage;
                pages.push(
                    <Button
                        key={i}
                        variant={isActive ? 'default' : 'outline'}
                        onClick={() => navigateToPage(i)}
                        disabled={isActive}
                        className={`
                            min-w-10 h-10 transition-all duration-200
                            ${isActive ? 'scale-105 shadow-sm' : 'hover:scale-105 active:scale-95'}
                        `}
                        aria-label={`Go to page ${i}`}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        {i}
                    </Button>
                );
            }

            // Show ellipsis after current range
            if (i === currentPage + 2 && currentPage < totalPages - 2) {
                pages.push(
                    <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground select-none">
                        ⋯
                    </span>
                );
            }
        }

        return pages;
    };

    return (
        <nav
            className="flex items-center justify-center gap-2"
            role="navigation"
            aria-label="Pagination"
        >
            <Button
                variant="outline"
                onClick={() => navigateToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1.5 h-10 transition-all duration-200 hover:scale-105 active:scale-95 disabled:scale-100"
                aria-label="Previous page"
            >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Previous</span>
            </Button>

            <div className="flex items-center gap-1">
                {renderPageNumbers()}
            </div>

            <Button
                variant="outline"
                onClick={() => navigateToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1.5 h-10 transition-all duration-200 hover:scale-105 active:scale-95 disabled:scale-100"
                aria-label="Next page"
            >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </nav>
    );
}