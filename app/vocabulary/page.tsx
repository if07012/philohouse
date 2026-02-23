"use client"
import { useEffect, useState } from "react";
import Link from 'next/link';

export default function Page() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch vocabulary categories
        // You can customize this to fetch from your API
        const fetchCategories = async () => {
            try {
                // For now, using static data - replace with API call if needed
                const data = [
                    { id: 'English', name: 'English Vocabulary', icon: '📚', color: 'blue' }
                ];
                setCategories(data);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching categories:', error);
                setLoading(false);
            }
        };

        fetchCategories();
    }, []);

    return (
        <main className="flex min-h-screen flex-col p-6">
            <div className="max-w-4xl mx-auto w-full">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Remember Vocabulary</h1>
                    <p className="text-gray-600">Practice and memorize vocabulary words</p>
                </div>

                {loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="block bg-white p-6 rounded-lg shadow-md text-center animate-pulse">
                                <div className="text-4xl mb-4 block h-10 bg-gray-200 rounded"></div>
                                <div className="h-6 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((category) => (
                            <Link
                                key={category.id}
                                href={`/vocabulary/${category.id}`}
                                className={`block bg-white p-6 rounded-lg shadow-md text-center transition duration-300 hover:shadow-lg hover:bg-${category.color}-50`}
                            >
                                <span className="text-4xl mb-4 block">{category.icon}</span>
                                <h2 className="text-xl font-semibold">{category.name}</h2>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

