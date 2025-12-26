import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("bg-pterocard border border-pteroborder rounded-lg shadow-sm p-6", className)}>
            {children}
        </div>
    );
}

export function Button({
    children,
    variant = 'primary',
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
    const variants = {
        primary: "bg-pteroblue hover:bg-blue-600 text-white",
        secondary: "bg-pteroinput hover:bg-pteroborder text-pterotext",
        danger: "bg-red-600 hover:bg-red-700 text-white",
        ghost: "bg-transparent hover:bg-pteroborder text-pterosub hover:text-white"
    };

    return (
        <button
            className={cn("px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center", variants[variant], className)}
            {...props}
        >
            {children}
        </button>
    );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={cn(
                "w-full bg-pteroinput border border-pteroborder text-pterotext rounded-md px-3 py-2 outline-none focus:border-pteroblue focus:ring-1 focus:ring-pteroblue transition-all placeholder:text-pterosub/50 disabled:opacity-50",
                className
            )}
            {...props}
        />
    );
}

export function Badge({ children, variant = 'blue', className }: { children: React.ReactNode, variant?: 'blue' | 'red' | 'green' | 'gray' | 'yellow', className?: string }) {
    const variants = {
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        red: "bg-red-500/10 text-red-400 border-red-500/20",
        green: "bg-green-500/10 text-green-400 border-green-500/20",
        gray: "bg-gray-500/10 text-gray-400 border-gray-500/20",
        yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    };

    return (
        <span className={cn("inline-flex items-center px-2 py-1 rounded text-xs font-medium border", variants[variant], className)}>
            {children}
        </span>
    );
}
