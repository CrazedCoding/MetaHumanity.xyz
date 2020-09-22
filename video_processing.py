"""
"""

#Image Classification and Manipulation
import gc
import torch
import torch.nn.functional as F
from torch.multiprocessing import Pool, Process
import torchvision
import imp
import io
from torchvision import models, transforms
from torch.autograd import Variable
import requests
from PIL import Image
import os
import mmap
import base64

#NLP
import spacy
import json

#WebSocket Server
from messages_pb2 import Message, InfoFrame, WordVector, Video
import asyncio
import time

#Video Reading/Writing
import ffmpeg
import subprocess
import sys

#Debugging
import numpy as np
import math
import logging
import pprint

#label_vectors = []

def run_inference(args):
    [start, end, video_duration, video_frame, labels, inference_model, device] = args
    
    with torch.no_grad():   
        output_tensor = inference_model.to(device)(video_frame.unsqueeze(0).to(device))
        #output_tensor = inference_model(video_frame.unsqueeze(0))
        #output_tensor.share_memory()
        #return torch.nn.Sigmoid()(output_tensor[0]).cpu()
        #return torch.nn.functional.softmax(output_tensor[0], dim=0).cpu()*2.-1.
        """
        low = torch.min(output_tensor[0])
        high = torch.max(output_tensor[0])
        return ((output_tensor[0].cpu()-low)/(high-low))*2.-1.
        """
        
        return output_tensor[0].cpu()#torch.nn.functional.softmax(output_tensor[0], dim=0).cpu()


def get_video_size(filename):
    #logger.info('Getting video size for {!r}'.format(filename))
    probe = ffmpeg.probe(filename)
    video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    width = int(video_info['width'])
    height = int(video_info['height'])
    return width, height

def start_ffmpeg_process(in_filename, width, height):
    #logger.info('Starting ffmpeg process1')
    args = (
        ffmpeg
        .input(in_filename)
        .output('pipe:', format='rawvideo', pix_fmt='rgb24', video_size="{}x{}".format(width,height))
        .compile()
    )
    return subprocess.Popen(args, stdout=subprocess.PIPE)

def read_frame(process1, in_width, in_height):
    frame_size = in_width * in_height * 3
    in_bytes = process1.stdout.read(frame_size)
    if len(in_bytes) == 0:
        frame = None
    else:
        assert len(in_bytes) == frame_size
        frame = (
            np
            .frombuffer(in_bytes, np.uint8)
            .reshape([-1, in_height, in_width, 3])
        )
    return frame

def process_query(input_queue, output_queue):
    global labels
    global inference_model_w2v_vectors

def process_upload(inference_model, input_queue, output_queue):
    global labels
    global inference_model_w2v_vectors
    normalize = transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])

    query_depth = input_queue.get()
    serialized_proto = input_queue.get()
    inference_model_input_size = input_queue.get()
    labels = input_queue.get()
    cuda_device = input_queue.get()
    inference_model_w2v_vectors = input_queue.get()
    
    proto = Message().FromString(serialized_proto)

    #print(gc.get_count())
    #gc.disable()
    gc.set_debug(gc.DEBUG_SAVEALL)

    inference_model = inference_model.to(cuda_device)

    #feature_vector = np.linalg.norm(feature_vector)

    videos_root = os.path.join(os.path.dirname(os.path.abspath(__file__)),"videos")
    if not os.path.exists(videos_root):
        os.mkdir(videos_root)
    videos_root = os.path.join(videos_root, proto.auth.user)
    if not os.path.exists(videos_root):
        os.mkdir(videos_root)
    time_stamp = int(time.time()*1E9)
    short_upload_name = "upload.{}{}".format(time_stamp, proto.video.extension)
    short_proto_name = "{}.proto".format(short_upload_name)
    uploaded_file_name = os.path.join(videos_root, short_upload_name)
    proto_file_name = os.path.join(videos_root, short_proto_name)
    """
    if not word_count:
        message = Message()
        message.type = Message.ERROR
        message.message = "The specified keywords create a null feature vector."
        output_queue.put((message.SerializeToString(), True, False, ))
        return
    """
    if os.path.isfile(uploaded_file_name):
        message = Message()
        message.type = Message.ERROR
        message.message = "The uploaded file already exists on the server."
        output_queue.put((message.SerializeToString(), True, False, ))
        return
    elif os.path.commonpath((videos_root, uploaded_file_name)) != videos_root:
        message = Message()
        message.type = Message.ERROR
        message.message = "Invalid file extension."
        output_queue.put((message.SerializeToString(), True, False, ))
        return
    else:
        result_video = Video()
        result_video.data = proto.video.data
        result_video.clientName = proto.video.clientName
        result_video.serverName = short_upload_name
        result_video.extension = proto.video.extension

        message = Message()
        message.type = Message.HALT
        message.message = "Saving uploaded video as: {}".format(short_upload_name)
        message.details = "0%"
        output_queue.put((message.SerializeToString(), False, False, ))
        
        with open(uploaded_file_name, "wb") as new_file:
            new_file.write(proto.video.data)
            new_file.close()
        threshold = 100.#proto.request.imageChangeThreshold

        message = Message()
        message.type = Message.HALT
        message.message = "Loading video meta-data."
        message.details = "0%"
        output_queue.put((message.SerializeToString(), False, False, ))
        
        #new_file = io.BytesIO(proto.request.video)
        #video_frames, audio_frames, video_info = torchvision.io.read_video(new_file, pts_unit='sec')

        cpu_count = os.cpu_count()

        probe = None
        try:
            probe = ffmpeg.probe(uploaded_file_name)
        except ffmpeg.Error as e:
            print(e.stderr, file=sys.stderr)
            sys.exit(1)

        video_stream = next((stream for stream in probe['streams'] if stream['codec_type'] == 'video'), None)
        if video_stream is None:
            print('No video stream found', file=sys.stderr)
            sys.exit(1)

        #print(video_stream)

        video_width = int(video_stream['width'])
        video_height = int(video_stream['height'])
        num_frames = int(video_stream['nb_frames'])
        video_duration = float(video_stream['duration'])

        process1 = start_ffmpeg_process(uploaded_file_name, video_width, video_height)
        
        last_progress = "-1%"
        message = Message()
        message.type = Message.HALT
        message.message = "Decompressing frames."
        message.details = "0%"
        output_queue.put((message.SerializeToString(), False, False, ))

        video = []
        out, _ = (
            ffmpeg
            .input(uploaded_file_name)
            .output('pipe:', format='rawvideo', pix_fmt='rgb24')
            .run(capture_stdout=True)
        )
        video = (
            np
            .frombuffer(out, np.uint8)
            .reshape([num_frames, video_height, video_width, 3])
        )
        preprocess = transforms.Compose([
        transforms.Resize((inference_model_input_size,inference_model_input_size)),
        transforms.ToTensor()
        ])
        resized_video = []
        last_progress = "";
        for i in range(0, len(video)):

            progress = "{}%".format(math.floor(len(resized_video)/num_frames*100.))

            if progress != last_progress:
                message = Message()
                message.type = Message.HALT
                message.message = "Resizing frames."
                message.details = progress
                output_queue.put((message.SerializeToString(), False, False, ))
                last_progress = progress

            resized_video.append(preprocess(Image.fromarray(video[i].astype('uint8'), 'RGB')))
        video = resized_video
        #print(video[0].shape)
        """
        while True:
            progress = "{}%".format(math.floor(len(video)/num_frames*100.))

            if progress != last_progress:
                message = Message()
                message.type = Message.HALT
                message.message = "Decompressing/resizing frames."
                message.details = progress
                output_queue.put((message.SerializeToString(), False, False, ))
                last_progress = progress

            in_frame = read_frame(process1, video_width, video_height)
            
            if type(in_frame) == type(None):
                break

            video.append(preprocess(in_frame[0]))
            del in_frame
        """
        num_frames = len(video)


        deltas_sum = 0
        progress_counter = 0


        last_progress = "-1%"

        last_frame = video[0].clone().detach().cuda()
        for i in range(0, num_frames):

            progress = "{}%".format(math.floor(i*100./num_frames))

            if progress != last_progress:
                message = Message()
                message.type = Message.HALT
                message.message = "Differentiating video frames."
                message.details = progress
                output_queue.put((message.SerializeToString(), False, False, ))
                last_progress = progress

            with torch.no_grad():

                in_frame_float = video[i].clone().detach().cuda()

                a = last_frame
                b = in_frame_float
                absolute_diff = abs(b-a)
                #deltas.append(absolute_diff)
                deltas_sum += absolute_diff
                last_frame = b
                progress_counter = progress_counter + 1
                del in_frame_float
                del a
                del b
                del absolute_diff
                #torch.cuda.empty1_cache()
            
        deltas_average = deltas_sum/num_frames

        #print(deltas_average)

        last_progress = "-1%"
        deltas_variance = 0.
        last_frame = video[0].clone().detach().cuda()
        for i in range(0, num_frames):
            progress = "{}%".format(math.floor(i*100./num_frames))

            if progress != last_progress:
                message = Message()
                message.type = Message.HALT
                message.message = "Calculating standard deviation of deltas."
                message.details = progress
                output_queue.put((message.SerializeToString(), False, False, ))
                last_progress = progress

            with torch.no_grad():

                in_frame_float = video[i].clone().detach().cuda()

                a = last_frame
                b = in_frame_float
                absolute_diff = abs(b-a)
                #deltas.append(absolute_diff)
                d = absolute_diff-deltas_average
                deltas_variance = deltas_variance + (d*d)
                last_frame = b
                del in_frame_float
                del a
                del b
                del absolute_diff
                del d
                #torch.cuda.empty_cache()

        deltas_variance = deltas_variance/num_frames
        deltas_standard_deviation = torch.tensor(np.sqrt(deltas_variance.cpu())).cuda()
        #print(deltas_standard_deviation)
        #print("Average of deltas: {}".format(deltas_average))
        #print("Variance of deltas: {}".format(deltas_variance))
        #print("Standard deviation of deltas: {}".format(deltas_standard_deviation))

        high_delta_ranges = [0]

        pinned_frame = None
        pinned_index = 0

        progress = 0

        high_delta_range_started = False

        last_progress = "-1%"
        for i in range(0, num_frames-1):
            in_frame = video[i]
            in_frame = in_frame.clone().detach()
            next_frame = video[i+1]
            next_frame = next_frame.clone().detach()

            #frame_grayscale = torchvision.transforms.ToTensor()(torchvision.transforms.Grayscale()(transforms.ToPILImage()(deltas[i])))
            #cl, c = k_means(frame_grayscale, 2)

            progress = "{}%".format(math.floor(i*100.0/num_frames))

            if progress != last_progress:
                message = Message()
                message.type = Message.HALT
                message.message = "Finding high-delta ranges."
                message.details = progress
                output_queue.put((message.SerializeToString(), False, False, ))
                last_progress = progress
        
            a = next_frame.cuda()
            b = in_frame.cuda()

            absolute_diff = abs(a-b)
            delta_change = (abs(absolute_diff-deltas_average)/deltas_standard_deviation).sum()/np.prod(absolute_diff.shape)
            #delta_change = torch.gt(delta_change, deltas_standard_deviation).float().sum()/np.prod(delta_change.shape)
            #low_delta_change = torch.le(delta_change, deltas_standard_deviation).float().sum()/np.prod(delta_change.shape)
            #print("{}".format(delta_change))
            #delta_change = delta_change.sum()/np.prod(delta_change.shape)
            thresh =  threshold/100.0

            if i == 0: 
                if delta_change > thresh:
                    high_delta_range_started = True
                else:
                    high_delta_range_started = False;
            elif not high_delta_range_started and delta_change > thresh:
                high_delta_range_started = True
                high_delta_ranges.append(i)
            elif high_delta_range_started and delta_change <= thresh:
                high_delta_range_started = False
                high_delta_ranges.append(i)
            del a, b
            
        if high_delta_ranges[len(high_delta_ranges)-1] < num_frames:
            high_delta_ranges.append(num_frames)

        new_ranges = []
        for i in range(0, len(high_delta_ranges)-1):
            new_ranges.append([high_delta_ranges[i], high_delta_ranges[i+1]])
        high_delta_ranges = new_ranges


        frame_messages = []
        last_progress = -1

        video_thumbnail = video[int(num_frames/2)].clone().detach()
        inputs = []
        last_progress = "-1%"
        thumbnails = []
        for r in high_delta_ranges:
            progress = "{}%".format(math.floor(r[0]*100.0/num_frames))

            if progress != last_progress:
                message = Message()
                message.type = Message.HALT
                message.message = "Generating visual inference inputs."
                message.details = progress
                output_queue.put((message.SerializeToString(), False, False, ))
                last_progress = progress


            start = r[0]*1.0/num_frames
            end = r[1]*1.0/num_frames

            mid_index = math.floor((start+end)/2.*num_frames)

            input_frame = video[mid_index].clone().detach()#.permute(2, 0, 1)
            in_buf = io.BytesIO()
            out_buf = io.BytesIO()
            transforms.ToPILImage('RGB')(input_frame).save(in_buf, format='PNG')
            
            byte_image = "data:image/png;base64,"+base64.b64encode(in_buf.getvalue()).decode("utf-8")     
            in_buf.close()
            out_buf.close()
            thumbnails.append(byte_image)
            #input_frame = normalize(torch.nn.functional.interpolate(input_frame, size=inference_model_input_size))
            input_frame = normalize(input_frame)
            #print(input_frame.shape)
            inputs.append([start, end, video_duration, input_frame, labels, inference_model, cuda_device])

        output_tensors = []
        last_progress = "-1%"
        for i in inputs:
            progress = "{}%".format(math.floor(i[0]*100.0))

            if progress != last_progress:
                message = Message()
                message.type = Message.HALT
                message.message = "Running visual inference model."
                message.details = progress
                output_queue.put((message.SerializeToString(), False, False, ))
                last_progress = progress
            output_tensors.append(run_inference(i))

        #for p in parameters: p.daemon = True
        #for p in parameters: p.start()
        #for p in parameters: p.join()
        
        #w2v_pool.terminate()
        #w2v_pool.close()
        #w2v_pool.join()


        output_tensor_index = 0

        new_inputs = []

        for i in inputs:
            new_inputs.append([])
            [start, end, video_duration, video_frame, _, _, _] = i
            new_inputs[output_tensor_index] = [start, end, video_duration, labels, output_tensors[output_tensor_index]]
            output_tensor_index = output_tensor_index + 1
        inputs = new_inputs

        results = []

        last_progress = "-1%"
        for arg_index in range(0, len(inputs)):

            progress = "{}%".format(math.floor(arg_index*100.0/len(inputs)))
            if progress != last_progress:
                message = Message()
                message.type = Message.HALT
                message.message = "Generating visual knowledge vectors."
                message.details = progress
                output_queue.put((message.SerializeToString(), False, False, ))
                last_progress = progress

            [start, end, video_duration, labels, probabilities] = inputs[arg_index]

            frame = InfoFrame()
            frame.start = start*video_duration
            frame.end = end*video_duration
            #node = frame_average_tree[depth-start_layer][node]
            #c = (node[0]+node[1])/2.
            probs, idx = probabilities.squeeze().sort(0, True)

            similarity = 0.
            total = 0.01

            visual_words = []
            visual_word_vectors = []
            visual_similar_words = []
            visual_similar_word_vectors = []

            for i in range(0, min(len(inference_model_w2v_vectors), query_depth)):
                word_vectors = inference_model_w2v_vectors[idx[i].item()][0]
                for j in range(0, len(word_vectors[0])):   
                    word = word_vectors[0][j]
                    vector = word_vectors[1][j]
                    visual_words.append(word)
                    visual_word_vectors.append(vector)
                    
                    #s = np.multiply(feature_vector, vector).sum()
                    """
                    similar_feature_vector_word = w2v_model.similar_by_word(tokens2[s2])[0][0] 
                    visual_similar_words.append(similar_feature_vector_word)
                    similar_feature_vector = w2v_model.word_vec(similar_feature_vector_word)
                    visual_similar_word_vectors.append(similar_feature_vector)
                    #w2v_model.similarity(feature_vector, tokens2[s2])
                    """
                    p = probs[ i].item()
                    frame.visualScores.append(p)
                    #similarity += s*p
                    #total += p
            
            for i in range(0, len(visual_words)):
                word_vector = WordVector()
                word_vector.word = visual_words[i]
                for element in visual_word_vectors[i]:
                    word_vector.vector.append(element)
                frame.words.append(word_vector)

            for i in range(0, len(visual_similar_words)):
                word_vector = WordVector()
                word_vector.word = visual_similar_words[i]
                for element in visual_similar_word_vectors[i]:
                    word_vector.vector.append(element)
                frame.similarWords.append(word_vector)

            frame.thumbnail = thumbnails[arg_index]

            proto.video.frames.append(frame)
            del visual_words, visual_word_vectors, visual_similar_words, visual_similar_word_vectors
            """
            for f in visual_words:
                del f
            del visual_words
            for f in visual_word_vectors:
                del f
            del visual_word_vectors
            for f in visual_similar_words:
                del f
            del visual_similar_words
            for f in visual_similar_word_vectors:
                del f
            del visual_similar_word_vectors
            """
        proto.video.duration = video_duration
        proto.video.serverName = short_upload_name
        proto.video.data = b''

        in_buf = io.BytesIO()
        out_buf = io.BytesIO()
        transforms.ToPILImage('RGB')(video_thumbnail).save(in_buf, format='PNG')
        
        byte_image = "data:image/png;base64,"+base64.b64encode(in_buf.getvalue()).decode("utf-8")     
        in_buf.close()
        out_buf.close()

        proto.video.thumbnail = byte_image
        with open(proto_file_name, "wb") as new_file:
            new_file.write(proto.SerializeToString())
            new_file.close()
        #w2v_pool.close()
        #w2v_pool.join()


        #w2v_pool.terminate()

        """
        processes = []
        for i in range(0, len(inputs)):
            print(i)
            p = Process(target=process_visual_inferences, args=)
            processes.append(p)

        for p in processes: p.start() # process jobs in parallel
        for p in processes: p.join()

        """
        
        """
        message = Message()
        message.type = Message.PROCESSING_RESULT
        for element in feature_vector:
            feature_word_vector.vector.append(element)
        message.result.featureVectors.append(feature_word_vector)
        for i in range(0, len(feature_vectors)):
            feature_word_vector = WordVector()
            feature_word_vector.word = feature_words[i]
            for element in feature_vectors[i]:
                feature_word_vector.vector.append(element)
            message.result.featureVectors.append(feature_word_vector)

        for element in results:
            message.result.frames.append(element)
        
        message.result.duration = video_duration
        #print(message)
        """
        output_queue.put((None, True, True, ))
        for result in results:
            del result
        del results
        for i in inputs:
            del i
        del inputs
        for o in output_tensors:
            del o
        del output_tensors
        for r in high_delta_ranges:
            del r
        del high_delta_ranges
        del proto
        del message
        del video
        gc.collect(2)
        torch.cuda.empty_cache()

        for item in gc.garbage:
            #print(item)
            del item

        