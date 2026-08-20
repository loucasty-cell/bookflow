from setuptools import setup, find_packages

setup(
    name="bookflow-backend",
    version="2.0.0",
    description="High-throughput visual OCR engine & document parsing backend for Bookflow",
    packages=find_packages(include=["app", "app.*"]),
    py_modules=["run", "main"],
    python_requires=">=3.10",
    entry_points={
        "console_scripts": [
            "bookflow-server=run:main",
        ],
    },
)
