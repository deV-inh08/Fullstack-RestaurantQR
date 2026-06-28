export default function LoadingScreen() {
    return (
        <>
            <style>{`
                @keyframes lds-ring {
                    0%   { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
            <div className="flex items-center justify-center min-h-screen">
                <div className="inline-block relative w-20 h-20">
                    <div className="block absolute w-16 h-16 m-2 border-8 border-solid border-t-[#FFC000] border-r-transparent border-b-transparent border-l-transparent rounded-full [animation:lds-ring_1.2s_cubic-bezier(0.5,0,0.5,1)_infinite] [animation-delay:-0.45s]" />
                    <div className="block absolute w-16 h-16 m-2 border-8 border-solid border-t-[#FFC000] border-r-transparent border-b-transparent border-l-transparent rounded-full [animation:lds-ring_1.2s_cubic-bezier(0.5,0,0.5,1)_infinite] [animation-delay:-0.3s]" />
                    <div className="block absolute w-16 h-16 m-2 border-8 border-solid border-t-[#FFC000] border-r-transparent border-b-transparent border-l-transparent rounded-full [animation:lds-ring_1.2s_cubic-bezier(0.5,0,0.5,1)_infinite] [animation-delay:-0.15s]" />
                    <div className="block absolute w-16 h-16 m-2 border-8 border-solid border-t-[#FFC000] border-r-transparent border-b-transparent border-l-transparent rounded-full [animation:lds-ring_1.2s_cubic-bezier(0.5,0,0.5,1)_infinite]" />
                </div>
            </div>
        </>
    )
}