import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { signUp } from "../lib/auth-client";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);

	return (
		<div className="page-wrap py-16 flex justify-center">
			<form
				className="island-shell rounded-2xl w-full max-w-sm p-8"
				onSubmit={async (e) => {
					e.preventDefault();
					setError(null);
					const { error } = await signUp.email({
						name,
						email,
						password,
					});
					if (error) {
						setError(error.message ?? "Registration failed.");
						return;
					}
					window.location.href = "/app";
				}}
			>
				<h1 className="display-title text-2xl font-bold">Register</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					New accounts are students by default.
				</p>
				<label className="mt-6 block text-sm font-medium">
					Name
					<input
						type="text"
						className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</label>
				<label className="mt-4 block text-sm font-medium">
					Email
					<input
						type="email"
						className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
				</label>
				<label className="mt-4 block text-sm font-medium">
					Password
					<input
						type="password"
						className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
					/>
				</label>
				{error && <p className="mt-3 text-sm text-destructive">{error}</p>}
				<button
					type="submit"
					className="mt-6 w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background"
				>
					Create account
				</button>
				<p className="mt-4 text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link to="/login" className="font-medium">
						Sign in
					</Link>
				</p>
			</form>
		</div>
	);
}
