"use client"
import { useEffect, useState } from "react";
import { useRouter, useParams } from 'next/navigation';

export default function Page() {
    const params = useParams();
    const language = params.language as string;
    const [levels, setLevels] = useState<any[]>([]);
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const callApi = async () => {
            try {
                const response = await fetch(`/api/sheet/all?group=${language}`,
                    {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    }
                );
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                setLevels([...data]);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching vocabulary levels:', error);
                setLoading(false);
            }
        };
        callApi();
    }, [language]);

    const getLanguageName = (lang: string) => {
        const names: { [key: string]: string } = {
            'english': 'English',
            'indonesian': 'Indonesian',
            'arabic': 'Arabic'
        };
        return names[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
    };

    return (
        <div className="flex flex-col items-center justify-center gap-8 min-h-min">
            <h1 className="text-6xl pt-10 font-bold mb-6">
                {getLanguageName(language)} Vocabulary
            </h1>

            <div className="flex flex-row flex-wrap gap-3 items-start justify-center">
                {loading && <>
                    <div className="block p-14 rounded-lg text-center cursor-pointer transition duration-300 animate-pulse bg-gray-200"></div>
                    <div className="block p-14 rounded-lg text-center cursor-pointer transition duration-300 animate-pulse bg-gray-200"></div>
                    <div className="block p-14 rounded-lg text-center cursor-pointer transition duration-300 animate-pulse bg-gray-200"></div>
                    <div className="block p-14 rounded-lg text-center cursor-pointer transition duration-300 animate-pulse bg-gray-200"></div>
                </>}
                {!loading && levels.length === 0 && (
                    <div className="text-center p-8">
                        <p className="text-xl text-gray-600">No vocabulary levels found.</p>
                    </div>
                )}
                {!loading && levels.map((n: any, index: number) => {
                    // Use levelName from API if available, otherwise extract from level
                    const levelName = n.levelName || n.level.replace(`vocab-${language}-`, '');
                    // Check isPass - ensure it's explicitly true (not just truthy)
                    const isPass = n.isPass === true || n.isPass === 'true';
                    
                    return <label 
                        key={index} 
                        className={`block p-8 rounded-lg text-center cursor-pointer transition duration-300 ${
                            isPass
                                ? "bg-green-800 border-2 border-green-500 text-white hover:bg-green-700"
                                : "bg-gray-50 hover:bg-blue-50 border-2"
                        }`}
                        onClick={() => {
                            router.push(`/vocabulary/${language}/${levelName}/learn`);
                        }}
                    >
                        <h2 className="text-4xl font-semibold">{levelName}</h2>
                        {isPass && (
                            <span className="text-lg mt-2 block">✓ Passed</span>
                        )}
                         {!isPass && (
                            <span className="text-lg mt-2 block">&nbsp;&nbsp;Ready&nbsp;&nbsp;</span>
                        )}
                    </label>
                })}
            </div>

            <button
                type="button"
                className="mt-8 bg-gray-500 text-white px-8 py-3 rounded-lg hover:bg-gray-600 transition duration-300"
                onClick={() => {
                    router.push('/vocabulary');
                }}
            >
                <h2 className="text-2xl font-semibold">Back</h2>
            </button>
        </div>
    );
}

