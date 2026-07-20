import { useAppContext } from "@/context/AppContext"
import { useSocket } from "@/context/SocketContext"
import { SocketEvent } from "@/types/socket"
import { RemoteUser, USER_STATUS } from "@/types/user"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { PiMicrophone, PiMicrophoneSlash, PiSpeakerHigh } from "react-icons/pi"

const ICE_SERVERS = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
}

const GroupAudio = () => {
    const { socket } = useSocket()
    const { currentUser, users, status } = useAppContext()
    const [isAudioEnabled, setIsAudioEnabled] = useState(false)
    const [activeAudioUsers, setActiveAudioUsers] = useState<RemoteUser[]>([])
    const localStreamRef = useRef<MediaStream | null>(null)
    const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
    const peerStreamsRef = useRef<Map<string, MediaStream>>(new Map())

    const cleanupPeer = useCallback((peerId: string) => {
        const connection = peerConnectionsRef.current.get(peerId)
        if (connection) {
            connection.close()
            peerConnectionsRef.current.delete(peerId)
        }

        peerStreamsRef.current.delete(peerId)
        setActiveAudioUsers((previous) =>
            previous.filter((user) => user.socketId !== peerId),
        )
    }, [])

    const createPeerConnection = useCallback(
        (peerId: string, username: string) => {
            if (peerConnectionsRef.current.has(peerId)) {
                return peerConnectionsRef.current.get(peerId)!
            }

            const connection = new RTCPeerConnection(ICE_SERVERS)

            connection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit(SocketEvent.AUDIO_ICE_CANDIDATE, {
                        targetSocketId: peerId,
                        candidate: event.candidate,
                    })
                }
            }

            connection.ontrack = (event) => {
                const [remoteStream] = event.streams
                if (remoteStream) {
                    peerStreamsRef.current.set(peerId, remoteStream)
                    const existingPeer = users.find(
                        (user) => user.socketId === peerId,
                    )
                    const resolvedUser =
                        existingPeer ??
                        ({ socketId: peerId, username } as RemoteUser)

                    setActiveAudioUsers((previous) => {
                        if (previous.some((user) => user.socketId === peerId)) {
                            return previous
                        }
                        return [...previous, resolvedUser]
                    })
                }
            }

            connection.onconnectionstatechange = () => {
                if (
                    connection.connectionState === "failed" ||
                    connection.connectionState === "closed" ||
                    connection.connectionState === "disconnected"
                ) {
                    cleanupPeer(peerId)
                }
            }

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => {
                    connection.addTrack(track, localStreamRef.current!)
                })
            }

            peerConnectionsRef.current.set(peerId, connection)
            return connection
        },
        [cleanupPeer, socket, users],
    )

    const connectToExistingPeers = useCallback(() => {
        users.forEach((user) => {
            if (user.socketId !== socket.id) {
                createPeerConnection(user.socketId, user.username)
            }
        })
    }, [createPeerConnection, socket.id, users])

    const startAudio = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            toast.error("This browser does not support microphone audio.")
            return
        }

        if (!currentUser.roomId) {
            toast.error("Join a room before enabling group audio.")
            return
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            })
            localStreamRef.current = stream
            setIsAudioEnabled(true)
            connectToExistingPeers()
            socket.emit(SocketEvent.AUDIO_JOIN, { roomId: currentUser.roomId })
        } catch {
            toast.error("Microphone access was denied or unavailable.")
        }
    }, [connectToExistingPeers, currentUser.roomId, socket])

    const stopAudio = useCallback(() => {
        localStreamRef.current?.getTracks().forEach((track) => track.stop())
        localStreamRef.current = null

        peerConnectionsRef.current.forEach((connection) => connection.close())
        peerConnectionsRef.current.clear()
        peerStreamsRef.current.clear()
        setActiveAudioUsers([])
        setIsAudioEnabled(false)

        if (currentUser.roomId) {
            socket.emit(SocketEvent.AUDIO_LEAVE, { roomId: currentUser.roomId })
        }
    }, [currentUser.roomId, socket])

    const handleUserJoinedAudio = useCallback(
        ({ socketId, username }: { socketId: string; username: string }) => {
            if (socketId === socket.id || !isAudioEnabled) {
                return
            }

            const existingConnection = peerConnectionsRef.current.get(socketId)
            if (existingConnection) {
                return
            }

            const connection = createPeerConnection(socketId, username)
            const createOffer = async () => {
                const offer = await connection.createOffer()
                await connection.setLocalDescription(offer)
                socket.emit(SocketEvent.AUDIO_OFFER, {
                    targetSocketId: socketId,
                    offer,
                })
            }

            void createOffer()
        },
        [createPeerConnection, isAudioEnabled, socket],
    )

    const handleAudioOffer = useCallback(
        async ({
            fromSocketId,
            offer,
        }: {
            fromSocketId: string
            offer: RTCSessionDescriptionInit
        }) => {
            if (!isAudioEnabled || !localStreamRef.current) {
                return
            }

            const connection = createPeerConnection(fromSocketId, "")
            await connection.setRemoteDescription(
                new RTCSessionDescription(offer),
            )
            const answer = await connection.createAnswer()
            await connection.setLocalDescription(answer)
            socket.emit(SocketEvent.AUDIO_ANSWER, {
                targetSocketId: fromSocketId,
                answer,
            })
        },
        [createPeerConnection, isAudioEnabled, socket],
    )

    const handleAudioAnswer = useCallback(
        async ({
            fromSocketId,
            answer,
        }: {
            fromSocketId: string
            answer: RTCSessionDescriptionInit
        }) => {
            const connection = peerConnectionsRef.current.get(fromSocketId)
            if (connection) {
                await connection.setRemoteDescription(
                    new RTCSessionDescription(answer),
                )
            }
        },
        [],
    )

    const handleAudioCandidate = useCallback(
        async ({
            fromSocketId,
            candidate,
        }: {
            fromSocketId: string
            candidate: RTCIceCandidateInit
        }) => {
            const connection = peerConnectionsRef.current.get(fromSocketId)
            if (connection) {
                try {
                    await connection.addIceCandidate(
                        new RTCIceCandidate(candidate),
                    )
                } catch {
                    // Ignore candidate errors while peers are still negotiating.
                }
            }
        },
        [],
    )

    const handleAudioLeft = useCallback(
        ({ socketId }: { socketId: string }) => {
            cleanupPeer(socketId)
        },
        [cleanupPeer],
    )

    useEffect(() => {
        if (status !== USER_STATUS.JOINED) {
            return
        }

        if (isAudioEnabled) {
            connectToExistingPeers()
        }
    }, [connectToExistingPeers, isAudioEnabled, status])

    useEffect(() => {
        socket.on(SocketEvent.AUDIO_USER_JOINED, handleUserJoinedAudio)
        socket.on(SocketEvent.AUDIO_OFFER, handleAudioOffer)
        socket.on(SocketEvent.AUDIO_ANSWER, handleAudioAnswer)
        socket.on(SocketEvent.AUDIO_ICE_CANDIDATE, handleAudioCandidate)
        socket.on(SocketEvent.AUDIO_USER_LEFT, handleAudioLeft)

        return () => {
            socket.off(SocketEvent.AUDIO_USER_JOINED, handleUserJoinedAudio)
            socket.off(SocketEvent.AUDIO_OFFER, handleAudioOffer)
            socket.off(SocketEvent.AUDIO_ANSWER, handleAudioAnswer)
            socket.off(SocketEvent.AUDIO_ICE_CANDIDATE, handleAudioCandidate)
            socket.off(SocketEvent.AUDIO_USER_LEFT, handleAudioLeft)
        }
    }, [
        handleAudioAnswer,
        handleAudioCandidate,
        handleAudioLeft,
        handleAudioOffer,
        handleUserJoinedAudio,
        socket,
    ])

    return (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-200">
            <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                    <p className="font-semibold text-white">Group audio</p>
                    <p className="text-xs text-slate-400">
                        Toggle your mic and talk with the room.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={isAudioEnabled ? stopAudio : startAudio}
                    disabled={status !== USER_STATUS.JOINED}
                    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        isAudioEnabled
                            ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                            : "bg-slate-800 text-slate-100 hover:bg-slate-700"
                    } ${status !== USER_STATUS.JOINED ? "cursor-not-allowed opacity-60" : ""}`}
                >
                    {isAudioEnabled ? (
                        <PiMicrophoneSlash size={16} />
                    ) : (
                        <PiMicrophone size={16} />
                    )}
                    {isAudioEnabled ? "Mute mic" : "Join audio"}
                </button>
            </div>

            {activeAudioUsers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {activeAudioUsers.map((user) => (
                        <div
                            key={user.socketId}
                            className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1"
                        >
                            <audio
                                autoPlay
                                playsInline
                                ref={(element) => {
                                    if (
                                        element &&
                                        peerStreamsRef.current.get(
                                            user.socketId,
                                        )
                                    ) {
                                        element.srcObject =
                                            peerStreamsRef.current.get(
                                                user.socketId,
                                            )!
                                    }
                                }}
                            />
                            <PiSpeakerHigh
                                size={14}
                                className="text-emerald-400"
                            />
                            <span className="text-xs text-slate-200">
                                {user.username}
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-slate-500">
                    {status === USER_STATUS.JOINED
                        ? "No one is speaking yet. Start the mic to join the live room audio."
                        : "Join the room first to enable audio."}
                </p>
            )}
        </div>
    )
}

export default GroupAudio
