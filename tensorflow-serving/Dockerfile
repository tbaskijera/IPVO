FROM tensorflow/serving:latest
WORKDIR /app
COPY . /app
ENV MODEL_NAME boston_model
ENV MODEL_BASE_PATH /app/
EXPOSE 8501
CMD ["sh", "-c", "tensorflow_model_server --model_name=$MODEL_NAME --model_base_path=$MODEL_BASE_PATH"]



