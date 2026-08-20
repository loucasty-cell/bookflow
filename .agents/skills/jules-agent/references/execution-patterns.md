# Jules Execution Patterns & Safety Rules

Safe code editing practices, surgical modifications, and non-destructive refactoring rules.

---

## 1. Surgical Modification Rules

1. **Always Read Before Write**:
   - Use `view_file` to read the exact line range and surrounding context before proposing edits.
   - Note indentation, line endings, and import order.

2. **Single Contiguous Replacements**:
   - Prefer single contiguous replacements for cohesive changes.
   - Keep target content exact and include sufficient unique context lines to avoid ambiguous replacements.

3. **Preserve Existing Structure**:
   - Never replace an entire file when modifying a few functions or components.
   - Preserve unrelated comments, docstrings, and license headers.
   - Preserve existing function signatures unless a breaking change is explicitly requested and all call sites are updated.

---

## 2. Pydantic v2 & API Serialization Patterns

When bridging Python backends with JavaScript/TypeScript frontends:
- Use `serialization_alias` and `validation_alias` rather than bare `alias` on Pydantic v2 fields.
- This enables clean snake_case keyword arguments in Python code while serializing to camelCase JSON for the frontend:
  ```python
  class SampleModel(BaseModel):
      model_config = ConfigDict(populate_by_name=True)
      
      page_number: int = Field(
          ...,
          serialization_alias="pageNumber",
          validation_alias="pageNumber",
      )
  ```

---

## 3. Asynchronous Concurrency & Error Boundaries

- Always pair concurrency semaphores with `try...finally` blocks to guarantee release.
- Avoid holding locks or blocking calls inside async loops.
- Offload CPU-bound tasks (e.g., image rendering, rasterization, heavy parsing) to `ThreadPoolExecutor` or `asyncio.to_thread`.
- In React, clean up `useEffect` subscriptions, event listeners, intervals, and observers.
