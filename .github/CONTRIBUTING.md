# Contributing

First off, thank you for taking the time to contribute to Vidstack ❤️

## 💭 Knowledge

- Code is written in [TypeScript][typescript].
- Apps are built with [SvelteKit][svelte-kit].
- We use [Lit][lit] to build [Web Components][web-components].
- [Turborepo][turborepo] makes our monorepo go vroom!

## 🎒 Getting Started

### Installation

Let's setup our machine. The only software you'll need to install is:

- [node](https://nodejs.org/en/download)
- [git](https://git-scm.com/downloads)
- [pnpm](https://pnpm.io/installation)
- [volta](https://docs.volta.sh/guide) or [nvm](https://github.com/nvm-sh/nvm) (we recommend volta)

They're very easy to install, just follow the links and you should be up and running in no time.

### Fork & Clone

Next, head over to the [Vidstack repository on GitHub][vidstack-gh] and click the `Fork` button
in the top right corner. After the project has been forked, run the following commands in your
terminal...

```bash
$: git clone https://github.com/{your-github-username}/vidstack --depth=1

$: cd vidstack
```

**OPTIONAL:** Now it'll help if we keep our `main` branch pointing at the original repository and
make pull requests from the forked branch.

```bash
# Add the original repository as a "remote" called "upstream".
$: git remote add upstream git@github.com:vidstack/vidstack.git

# Fetch the git information from the remote.
$: git fetch upstream

# Set your local main branch to use the upstream main branch when ever you run `git pull`.
$: git branch --set-upstream-to=upstream/main main

# Run this when we want to update our version of main.
$: git pull
```

### Node

Set your Node version to match the required version by the repo. If you've installed `volta` then
it will automatically pin it, and if you're using `nvm` simply run `nvm use` from the project root.

## 💼 Package Manager

```bash
# Install all dependencies and symlink packages in the workspace (see `pnpm-workspace.yaml`).
$: pnpm i

# Install dependency for a single package.
$: pnpm install {package} --filter @vidstack/player

# Update a dependency for a single package.
$: pnpm up {package} --filter @vitebook/player

# Update a dependency for all packages.
$: pnpm up {package}@{version} -r
```

## 🏗 Building

```bash
# Build all packages (turbo)
$: pnpm build

# Build all apps (turbo)
$: pnpm build:app

# Build single package
$: pnpm build:pkg --filter @vidstack/player

# Build single app
$: pnpm build:app --filter vidstack.io

# Build and watch single package
$: pnpm watch --filter @vidstack/player
```

## 💻 Development

```bash
# Run workspace in dev mode (turbo)
$: pnpm dev

# Run single app in dev mode
$: pnpm dev --filter vidstack.io
```

### Sandbox

A sandbox is a Vite development environment that enables you to play with a package right in your
browser. The sandbox directory is Git-ignored so you can safely do whatever you like inside of
it.

```bash
# Play with `@vidstack/foundation` package in your browser.
$: pnpm sandbox --filter @vidstack/foundation

# Play with `@vidstack/player` package in your browser.
$: pnpm sandbox --filter @vidstack/player
```

After running any of the commands above, you can find the sandbox directory at `packages/*/sandbox`.
You can delete the directory and re-run the sandbox command to reset it.

## 🧪 Testing

Unit tests are located in the `tests` directory inside an app or package. Run
`pnpm test --filter {pkg_name}` or `pnpm test:watch --filter {pkg_name}` in the terminal. This
project uses [Vitest][vitest] for writing/running unit tests. To learn more about writing unit
tests, follow the link to the Vitest site, and see other tests in the repo.

```bash
# Run all tests (turbo)
$: pnpm test

# Run tests in single package
$: pnpm test --filter @vidstack/player

# Run tests in watch mode for a single package
$: pnpm test:watch --filter @vidstack/player
```

## ✍️ Committing

This project uses [semantic commit messages][semantic-commit-style] to automate package releases.
Refer to the link, and check out existing commits (`git log`) to get an idea of how to write
your message.

## 🎉 Pull Requests

When you're all done, head over to the [repository][vidstack-gh] and click the big green
`Compare & Pull Request` button. This will appear after you've pushed changes to your fork.

Don't expect your PR to be accepted immediately, or accepted at all. Give the community time to
vet it and see if it should be merged. Please don't be disheartened if it's not accepted. Your
contribution is appreciated more then you can imagine, and even a failed PR can teach us a lot ❤️

[lit]: https://lit.dev
[semantic-commit-style]: https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716
[svelte]: https://svelte.dev
[svelte-kit]: https://kit.svelte.dev
[turborepo]: https://turborepo.org
[typescript]: https://www.typescriptlang.org
[vidstack-gh]: https://github.com/vidstack/vidstack
[vitest]: https://vitest.dev
[web-components]: https://developer.mozilla.org/en-US/docs/Web/Web_Components
