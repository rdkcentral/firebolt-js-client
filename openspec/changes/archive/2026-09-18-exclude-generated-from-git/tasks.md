## 1. Git Configuration Updates

- [x] 1.1 Add `generated/*` pattern to root `.gitignore`
- [x] 1.2 Add `firebolt-inject.d.ts` pattern to root `.gitignore`
- [x] 1.3 Stage the updated `.gitignore` file

## 2. Unstage Generated Files

- [x] 2.1 Unstage all files in the `generated/` directory using `git restore --staged generated/`
- [x] 2.2 Unstage the root-level `firebolt-inject.d.ts` file using `git restore --staged firebolt-inject.d.ts`

## 3. Verification

- [x] 3.1 Run `git status` to confirm generated files are unstaged and `.gitignore` is staged
- [x] 3.2 Run `npm run generate` to verify generation still produces files in `generated/` folder
- [x] 3.3 Run `cd package && npm run build` to verify package build process still works
- [x] 3.4 Verify that new generated files are not shown as untracked by git